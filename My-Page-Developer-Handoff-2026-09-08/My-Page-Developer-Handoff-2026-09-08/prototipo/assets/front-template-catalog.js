(() => {
 const original=document.querySelector('#templates .gallery');if(!original)return;
 const host=document.createElement('div');original.replaceWith(host);
 renderTemplateCatalog(host,window.chooseMyPageTemplate,'');
})();
