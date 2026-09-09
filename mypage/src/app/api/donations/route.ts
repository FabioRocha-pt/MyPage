import { db } from "@/lib/db";
import {
  ApiError,
  clientKey,
  handle,
  ok,
  optionalString,
  rateLimit,
  readJson,
  requireBool,
  requireInt,
  requireString,
} from "@/lib/api";
import { getProvider, idempotencyKey } from "@/lib/payments";

/**
 * PUBLIC donation intent.
 *
 * Doc 02: "Front pretendido: vídeo, pedido, barra de progresso e doadores que
 * escolhem anonimato ou nome público. Progresso deve contar apenas pagamentos
 * confirmados."
 *
 * The row is created as `pending` and contributes nothing to the progress bar
 * until the webhook verifies the payment. No bank details are collected or
 * stored here — doc 02: "Não criar dados bancários fictícios nem afirmar que o
 * dinheiro foi recebido."
 */

const MIN_DONATION_MINOR = 10000; // 100 CVE
const MAX_DONATION_MINOR = 100_000_00;

export const POST = handle(async (request: Request) => {
  rateLimit(clientKey(request, "donate"), 10, 10 * 60 * 1000);

  const body = await readJson(request);
  const campaignId = requireString(body, "campaignId", { max: 40 });
  const amountMinor = requireInt(body, "amountMinor", {
    min: MIN_DONATION_MINOR,
    max: MAX_DONATION_MINOR,
  });

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, artistId: true, title: true, currency: true, status: true, isPublic: true },
  });
  if (!campaign || !campaign.isPublic || campaign.status !== "active") {
    throw new ApiError("Campanha não disponível.", 404, "not_found");
  }

  const isAnonymous = requireBool(body, "isAnonymous", true);
  const displayName = isAnonymous ? null : optionalString(body, "displayName", 80);
  if (!isAnonymous && !displayName) {
    throw new ApiError("Indica o nome a mostrar ou escolhe doar anonimamente.", 400, "missing_name");
  }

  const donorEmail = optionalString(body, "donorEmail", 200);
  if (donorEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donorEmail)) {
    throw new ApiError("Email inválido.", 400, "invalid_email");
  }

  const donation = await db.donation.create({
    data: {
      campaignId: campaign.id,
      amountMinor,
      currency: campaign.currency,
      displayName,
      isAnonymous,
      donorEmail: donorEmail?.toLowerCase() ?? null,
      message: optionalString(body, "message", 500),
      status: "pending",
    },
  });

  const provider = getProvider();
  try {
    const intent = await provider.createIntent({
      amountMinor,
      currency: campaign.currency,
      purpose: "donation",
      idempotencyKey: idempotencyKey("donation", donation.id),
      description: `Donativo · ${campaign.title}`,
      returnUrl: `/donations/${donation.id}`,
    });

    await db.donation.update({ where: { id: donation.id }, data: { paymentId: intent.paymentId } });

    return ok(
      {
        donationId: donation.id,
        redirectUrl: intent.redirectUrl,
        amountMinor,
        currency: campaign.currency,
        notice:
          "O donativo só é contabilizado depois de o pagamento ser validado. Nenhum valor foi cobrado até aqui.",
      },
      { status: 201 },
    );
  } catch (error) {
    await db.donation.update({ where: { id: donation.id }, data: { status: "failed" } });
    throw error;
  }
});
