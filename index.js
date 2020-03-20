


const pixelPainter = document.querySelector('#pixel-canvas');
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
const swapColorsButton = painterToolsForm.querySelector('button[name=swap-colors]');
const inverseColorsButton = painterToolsForm.querySelector('button[name=inverse]');

clearButton.addEventListener('click', function(e) {
    pixelPainter.clear();
});

fillButton.addEventListener('click', function(e) {
    pixelPainter.fill();
});

swapColorsButton.addEventListener('click', function(e) {
    const fci = painterToolsForm.querySelector('input[name=first-color]'),
          sci = painterToolsForm.querySelector('input[name=second-color]');

    const scv = sci.value;
    sci.jscolor.fromString(fci.value);
    fci.jscolor.fromString(scv);

    pixelPainter.setAttribute('first-color', '#'+fci.value);
    pixelPainter.setAttribute('second-color', '#'+sci.value);
})

inverseColorsButton.addEventListener('click', function(e) {
    pixelPainter.inverse();
    //document.querySelector('body').classList.toggle('kek');
})



const dataText = document.querySelector('#export-text');

dataText.addEventListener('focus', function(e) {
    e.target.select();
    // document.execCommand('copy');
});

pixelPainter.addEventListener('cellupdate', function(e) {
    const cells = e.detail.cells;

    function colorToRGBTuple(v) {
        if (/\#([0-f0-F]{2}){3}/.test(v)) {
            const vs = [v.slice(1, 3), v.slice(3, 5), v.slice(5)]
            return vs.map(e => parseInt(e, 16))
        } else if (/\#[0-f0-F]{3}/.test(v)) {
            return v.split('').slice(1).map(e => e+'0').map(e => parseInt(e, 16))
        } else if (/rgb\s?\(\s?\d+\s?,\s?\d+\s?,\s?\d+\s?\)/.test(v)) {
            return v.match(/\d+/g).map(parseInt);
        } else if (/rgba\s?\(\s?\d+\s?,\s?\d+\s?,\s?\d+\s?\,\s?\d+\s?\)/.test(v)) {
            const vs = v.match(/\d+/g).map(parseInt);
            return vs.slice(0, 3).map(e => e*v[3]);
        } else {
            throw new Error(`unknown color format: ${v}`);
        }
    }

    function rgbTupleToHexTuple(v) {
        return v.map(e => '0x'+e.toString(16));
    }

    function strArray(a) {
        return `{${a.join(', ')}}`;
    }

    const rgbTuples = cells
        .as2D()
        .map(e => '    '+strArray(e.map(colorToRGBTuple).map(rgbTupleToHexTuple).map(strArray)))
        .join(',\n');

    dataText.value = `
#define row_count ${cells.height}
#define col_count ${cells.width}

char image[row_count][col_count][3] = {
${rgbTuples}
};
`
});


const LOCAL_STORAGE_DUMP_KEY = 'wip';

document.addEventListener('DOMContentLoaded', function(e) {
    if (localStorage.hasOwnProperty(LOCAL_STORAGE_DUMP_KEY)) {
        pixelPainter.load(localStorage.getItem(LOCAL_STORAGE_DUMP_KEY), true);
        painterToolsForm.querySelector('input[name=width]').value = pixelPainter.getAttribute('width');
        painterToolsForm.querySelector('input[name=height]').value = pixelPainter.getAttribute('height');
    }
});


function dumpCells(e) {
    localStorage.setItem(LOCAL_STORAGE_DUMP_KEY, pixelPainter.dump(true));
}

document.addEventListener('visibilitychange', (e) => (document.visibilityState === 'hidden' ? dumpCells(e) : undefined));
window.addEventListener('beforeunload', dumpCells);
















/// kek


function compose(...fs) {
    if (fs.length == 0) {
        throw new Error('compose requires at least one argument');
    }
    function f(...args) {
        let r = fs[0](...args);
        for (let i = 1; i < fs.length; i++) {
            r = fs[i](r);
        }
        return r;
    }
    return f;
}

function filterCompose(f, ...fs) {
    function ff(...args) {
        for (let i = 0; i < fs.length; i++) {
            if (fs[i](...args) === false) {
                return;
            }
        }
        return f(...args);
    }
    return ff;
}

// const k = compose(Math.min, n => Math.pow(n, 2));
// console.log(k, '===', k(2, 3) === 4);

// const l = filterCompose(Math.pow, i => i >= 2, () => document.visibilityState === 'visible');
// console.log(l(2, 3));
