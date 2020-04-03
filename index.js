


const pixelPainter = document.querySelector('#pixel-canvas');
const painterToolsForm = document.querySelector('#painter-tools');
const fontMap = document.querySelector('#font-map');

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
    // e.target.select();
    // document.execCommand('copy');
});

// canvas to c array pixel array
// pixelPainter.addEventListener('cellupdate', function(e) {
//     const cells = e.detail.cells;

//     function colorToRGBTuple(v) {
//         if (/\#([0-f0-F]{2}){3}/.test(v)) {
//             const vs = [v.slice(1, 3), v.slice(3, 5), v.slice(5)]
//             return vs.map(e => parseInt(e, 16))
//         } else if (/\#[0-f0-F]{3}/.test(v)) {
//             return v.split('').slice(1).map(e => e+'0').map(e => parseInt(e, 16))
//         } else if (/rgb\s?\(\s?\d+\s?,\s?\d+\s?,\s?\d+\s?\)/.test(v)) {
//             return v.match(/\d+/g).map(parseInt);
//         } else if (/rgba\s?\(\s?\d+\s?,\s?\d+\s?,\s?\d+\s?\,\s?\d+\s?\)/.test(v)) {
//             const vs = v.match(/\d+/g).map(parseInt);
//             return vs.slice(0, 3).map(e => e*v[3]);
//         } else {
//             throw new Error(`unknown color format: ${v}`);
//         }
//     }

//     function rgbTupleToHexTuple(v) {
//         return v.map(e => '0x'+e.toString(16));
//     }

//     function strArray(a) {
//         return `{${a.join(', ')}}`;
//     }

//     const rgbTuples = cells
//         .as2D()
//         .map(e => '    '+strArray(e.map(colorToRGBTuple).map(rgbTupleToHexTuple).map(strArray)))
//         .join(',\n');

//     dataText.value = `
// #define row_count ${cells.height}
// #define col_count ${cells.width}
// //#define data_count (col_count*3/8)

// char image[row_count][col_count][3] = {
// ${rgbTuples}
// };
// `
// });





// canvas to font editor
fontMap.addEventListener('charmapupdate', function(e) {
    // const cells = e.detail.cells;

    const { charCells, charWidth, charHeight } = e.detail;

    const bytesCount = charWidth * charHeight / 8;

    if (!Number.isInteger(bytesCount)) {
       dataText.value = `
#Error: w (${charWidth}) * h (${charHeight}) / 8 = ${bytesCount}
#font mask can not be packed into one byte! 
`;
        return;
    }

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

    function toMask(v) {
        return v.filter(i => i == 0).length === 3 ? '0' : '1'
    }

    function flattenBits(cells) {
        return cells
            .map(colorToRGBTuple)
            .map(toMask)
            .join('');
    }

    function groupToBytes(flatBits) {
        return new Array(flatBits.length/8).fill(0).map((_, i) => flatBits.slice(i*8, (i+1)*8)).map(e => parseInt(e.split('').reverse().join(''), 2))
    }

    function asPythonLiteral(bytes) {
        return `b'${bytes.map(e => '\\x'+e.toString(16).padStart(2, '0')).join('')}'`;
    }

    function asCCharArray(bytes) {
        return `{${bytes.map(e => '0x'+e.toString(16).padStart(2, '0')).join(', ')}}`;
    }

    function withComments(commentChar = '#') {
        return (v, i) => {
            return `${v}    ${commentChar} ${charCells[i].char}`;
        }
    }

    const charBytes = charCells
        .map(flattenBits)
        .map(groupToBytes);

    dataText.value = 
`# ${bytesCount} bytes each char

as python literal: 
${charBytes.map(asPythonLiteral).map(withComments('#')).join('\n')}
`
// as C char array:
// ${charBytes.map(asCCharArray).join('\n')}
// `
});


const LOCAL_STORAGE_DUMP_KEY = 'wip';

document.addEventListener('DOMContentLoaded', function(e) {
    if (localStorage.hasOwnProperty(LOCAL_STORAGE_DUMP_KEY)) {
        pixelPainter.load(localStorage.getItem(LOCAL_STORAGE_DUMP_KEY), true);
        painterToolsForm.querySelector('input[name=width]').value = pixelPainter.getAttribute('width');
        painterToolsForm.querySelector('input[name=height]').value = pixelPainter.getAttribute('height');
    }
    if (localStorage.hasOwnProperty(LOCAL_STORAGE_DUMP_FONT_MAP_KEY)) {
        fontMap.load(localStorage.getItem(LOCAL_STORAGE_DUMP_FONT_MAP_KEY), true);
    }
});


function dumpCells(e) {
    localStorage.setItem(LOCAL_STORAGE_DUMP_KEY, pixelPainter.dump(true));
}

document.addEventListener('visibilitychange', (e) => (document.visibilityState === 'hidden' ? dumpCells(e) : undefined));
window.addEventListener('beforeunload', dumpCells);


const LOCAL_STORAGE_DUMP_FONT_MAP_KEY = `font-map:${LOCAL_STORAGE_DUMP_KEY}`;

function dumpFontMapCells(e) {
    localStorage.setItem(LOCAL_STORAGE_DUMP_FONT_MAP_KEY, fontMap.dump(true));
}

document.addEventListener('visibilitychange', (e) => (document.visibilityState === 'hidden' ? dumpFontMapCells(e) : undefined));
window.addEventListener('beforeunload', dumpFontMapCells);






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
