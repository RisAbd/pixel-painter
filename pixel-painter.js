

function randomColor() {
  return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
}

function styleSelector(selector, d = document) {
  const shs = d.styleSheets;
  for (let i = 0; i < shs.length; i++) {
    const crs = shs[i].cssRules;
    for (let j = 0; j < crs.length; j++) {
      const cr = crs[j];
      // ?? only direct comparision works
      if (cr.selectorText === selector) {
        return cr.style;
      }
    }
  }
  return null;
}


class CellsArray extends Array {
  constructor(w, h) {
    w = w || 0;
    h = h || 0;
    super(w*h);
    this.width = this.w = w;
    this.height = this.h = h;
  }

  get(x, y) {
    return this[y*this.width+x];
  }
  set(x, y, v) {
    this[y*this.width+x] = v;
  }

  copy(another) {
    for (let y = 0; y < Math.min(this.height, another.height); y++) {
      for (let x = 0; x < Math.min(this.width, another.width); x++) {
        this.set(x, y, another.get(x, y));
      }
    }
  }

  as2D() {
    const r = new Array(this.height);
    for (let i = 0; i < this.width; i++) {
      r[i] = this.slice(i*this.width, (i+1)*this.width);
    }
    return r;
  }
}


customElements.define('pixel-painter', class PixelPainter extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height', 'cell-width', 'cell-height'];
  }

  getHeight() {
    return +this.getAttribute('height');
  }
  getWidth() {
    return +this.getAttribute('width');
  }
  getPencil() {
    return this.getAttribute('pencil-color') || 'red';
  }
  getEraser() {
    return this.getAttribute('eraser-color') || 'black';
  }

  constructor() {
    super();

    // model

    this.cells = new CellsArray(this.getWidth(), this.getHeight());
    this.mouseDownButton = null;

    //
    this.oncontextmenu = () => false; 
    const fs = 'onCellClick onCellMove onMouseDown onMouseUp'.split(' ');
    for (let i = 0; i < fs.length; i++) {
      const fn = fs[i];
      this[fn] = this[fn].bind(this);
    }

    this.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);


    // view stuff

    const shadow = this.attachShadow({mode: 'open'});

    const cellWidth = this.getAttribute('cell-width') || '20px';
    const cellHeight = this.getAttribute('cell-height') || '20px';

    const style = document.createElement('style');
    style.textContent = `
    * {
      box-sizing: border-box;
    }

    .wrapper {
      width: 100%;
      height: 100%;
      display: grid;
      margin: 0 auto;
      grid-auto-rows: 1fr;
      background-color: transparent;
    }

    .cell {
      width: ${cellWidth};
      height: ${cellHeight};
      background-color: black;
      padding: 1px;
    }

    .cell:hover {
      border: solid 2px yellow;
      padding: 0;
    }
    `;

    shadow.appendChild(style);

    this.renderCells();
  }

  renderCells() {

    const shadow = this.shadowRoot;

    const prevCellContainer = shadow.querySelector('.wrapper');

    const width = this.getWidth();
    const height = this.getHeight();

    const cellContainer = document.createElement('div');

    cellContainer.classList.toggle('wrapper');
    cellContainer.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    cellContainer.style.gridTemplateRows = `repeat(${height}, 1fr)`;

    for (let i = 0; i < width*height; i++) {
      const cell = document.createElement('div');

      cell.classList.toggle('cell');
      cell.dataset.id = i;
      // cell.style.backgroundColor = randomColor();
      cell.addEventListener('mousemove', this.onCellMove);
      cell.addEventListener('click', this.onCellClick);

      this.paintCell(cell);

      cellContainer.appendChild(cell)
    }

    if (prevCellContainer) { 
      prevCellContainer.remove(); 
      const children = prevCellContainer.children;
      for (let i = 0; i < children.length; i++) {
        children[i].removeEventListener('mousemove', this.onCellMove);
        children[i].removeEventListener('click', this.onCellClick);
      }
      console.log(children.length)
    }

    shadow.appendChild(cellContainer);
  }

  paintCell(cell) {
    cell.style.backgroundColor = this.cells[cell.dataset.id] || 'black';
  }

  selectCell(cell, button) {
    const cellId = cell.dataset.id;

    if (button === 0) {
      this.cells[cellId] = this.getPencil();
      //console.log('select', cellId);
      //cell.style.backgroundColor = 'red';

    } else if (button === 2) {
      this.cells[cellId] = this.getEraser();
      //console.log('DEselect', cellId);
      //cell.style.backgroundColor = 'black';
    }

    this.paintCell(cell);
  }

  onCellClick(e) {
    this.selectCell(e.target, e.button);
  }

  onCellMove(e) {
    this._lastCell = e.target;
    if (this.mouseDownButton !== null) {
      this.selectCell(e.target, this.mouseDownButton);
    }
  }

  onMouseDown(e) {
    console.log('mousedown');
    this.mouseDownButton = e.button;
    this.selectCell(this._lastCell, e.button);
  }
  onMouseUp(e) {
    console.log('mouseup');
    this.mouseDownButton = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || oldValue === null) {
      return;
    }

    if (['cell-height', 'cell-width'].includes(name)) {
      const s = styleSelector('.cell', this.shadowRoot);
      if (s) {
        // width, height
        s[name.replace('cell-', '')] = newValue;
      }
    } 
    
    if (['height', 'width'].includes(name)) {
      console.log(name, oldValue, newValue);
      // copy old data to new array
      const prevArray = this.cells;
      this.cells = new CellsArray(this.getWidth(), this.getHeight());
      this.cells.copy(prevArray);
      this.renderCells();
    }
  }
});
