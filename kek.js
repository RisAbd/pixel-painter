
const root = document.querySelector('#root');

function randomColor(alpha = false) {
  const r = () => Math.floor(Math.random() * 256);
  const hx = () => r().toString(16).padStart(2, '0');
  if (!alpha) { return `#${hx()}${hx()}${hx()}`; }
  return `rgba(${r()}, ${r()}, ${r()}, ${Math.random()})`;
}

function gradient(n, ...colors) {
  if (colors.length === 0) {
    throw new Error('At least one color required');
  }
  if (colors.length === 1) {
    return new Array(n).fill(colors[0]);
  }

  const o = new Array(n).fill(0)
    .map((_, i) => Math.floor(i/(n/(colors.length-1))))
    .reduce((acc, i) => {acc[i] = (acc[i] || 0) + 1; return acc;}, {});

  return Object.keys(o).map((ci, gi, a) => {
    const cc = o[ci];  // colors count in group
    ci = +ci;
    const startColor = colors[ci], targetColor = colors[ci+1];
    const rd = (targetColor[0]-startColor[0]) / (cc-(gi === a.length-1 ? 1 : 0)),
      gd = (targetColor[1]-startColor[1]) / (cc-(gi === a.length-1 ? 1 : 0)),
      bd = (targetColor[2]-startColor[2]) / (cc-(gi === a.length-1 ? 1 : 0));
    return new Array(cc).fill(0).map((_, i) => [startColor[0]+(i*rd), startColor[1]+(i*gd), startColor[2]+(i*bd)])
  }).reduce((acc, i) => { return acc.concat(i); }, []);
}


// function split(t, n) {
//   return new Array(t).fill(0).map((_, i) => [i, Math.floor(i/(t/(n-1)))]).reduce((acc, [i, g]) => {
//     // if (i === t-1) { g = g-1; }
//     acc[g] = (acc[g] || []).concat(i); 
//     return acc;
//   }, {});
//   return new Array(n).fill(0).map((_, i) => {
//     return new Array(chl).fill(0).map((_, j) => i*chl+j);
//   });
// }

// console.log(10, 3, split(10, 3))
// console.log(5, 3, split(5, 3))
// console.log(4, 2, split(4, 2))
// console.log(15, 3, split(15, 3))



function createRowElement(n, ...colors) {
  const row = document.createElement('div');
  row.classList.toggle('row');

  const asCss = ([r,g,b]) => `rgb(${r}, ${g}, ${b})`;
  
  const grades = gradient(n, ...colors).map(asCss);

  for (let i = 0; i < n; i++) {
    const cell = document.createElement('div');
    cell.classList.toggle('color-cell');
    cell.style.backgroundColor = grades[i];
    row.appendChild(cell);
  }


  const labelBlock = document.createElement('span');
  labelBlock.innerText = 'util: ' + colors.map(String).join(' > ');
  labelBlock.style.position = 'absolute';
  row.appendChild(labelBlock);

  const compareRow = document.createElement('div');
  compareRow.classList.toggle('row');
  compareRow.classList.toggle('js');
  compareRow.innerText = 'js native';
  if (colors.length === 1) {
    compareRow.style.backgroundColor = asCss(colors[0]);
  } else {
    compareRow.style.background = `linear-gradient(to right, ${colors.map(asCss).join(', ')})`;
  }
  root.appendChild(compareRow);

  root.appendChild(row);

  const spacer = document.createElement('div');
  spacer.classList.toggle('spacer');
  root.appendChild(spacer);

  return row;
}


createRowElement(100, [255,0,0], [0,255,0]);
createRowElement(100, [0,255,255], [255,0,0]);
createRowElement(100, [255,255,255], [0,0,0]);
createRowElement(100, [0,0,255]);
createRowElement(100, [255,0,0], [0,255,0], [0,0,255]);
createRowElement(100, [255,255,255], [255,0,0], [0,255,0], [0,0,255], [0,0,0]);
