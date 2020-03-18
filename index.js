


const pixelPainter = document.querySelector('pixel-painter');
const painterToolsForm = document.querySelector('#painter-tools');

painterToolsForm.addEventListener('change', function(e) {
    const name = e.target.name;
    const value = e.target.value;

    if (name.includes('color')) {
        pixelPainter.setAttribute(name, '#'+value);
    } else if (name.includes('cell')) {
        pixelPainter.setAttribute(name, value+'px');
    } else {
        pixelPainter.setAttribute(name, value);
    }
});


const clearButton = painterToolsForm.querySelector('button[name=clear]');
const fillButton = painterToolsForm.querySelector('button[name=fill]');

clearButton.addEventListener('click', function(e) {
    pixelPainter.clear();
});

fillButton.addEventListener('click', function(e) {
    pixelPainter.fill();
});



const dataText = document.querySelector('#export-text');

pixelPainter.addEventListener('cellupdate', function(e) {
    const cells = e.detail.cells;   // .as2D();
    dataText.value = JSON.stringify(cells);
});
