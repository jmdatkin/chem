window.onload = function() {
    const canvasEl = document.querySelector(".canvas-wrapper");
    canvasEl.setAttribute("width",window.innerWidth);
    canvasEl.setAttribute("height",window.innerHeight);
    Chem(canvasEl);
};
 
