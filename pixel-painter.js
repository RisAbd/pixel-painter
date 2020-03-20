

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
  constructor(w, h, filler = undefined) {
    w = w || 0;
    h = h || 0;
    super(w*h);
    if (filler !== undefined) {
      this.fill(filler);
    }
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
    for (let i = 0; i < r.length; i++) {
      r[i] = this.slice(i*this.width, (i+1)*this.width);
    }
    return r;
  }

  dump(s = false) {
    const v = {height: this.height, width: this.width, cells: this};
    if (s) { return JSON.stringify(v); }
    return v;
  }

  load(v) {
    this.splice(0, v.cells.length, ...v.cells);
  }

  inverseValues() {
    for (let i = 0; i < this.length; i++) {
      this[i] = '#'+(parseInt(this[i].slice(1), 16)^0xffffff).toString(16).padStart(6, '0');
    }
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
  getFirstColor() {
    return this.getAttribute('first-color') || 'red';
  }
  getSecondColor() {
    return this.getAttribute('second-color') || 'black';
  }

  constructor() {
    super();

    // model

    this.cells = new CellsArray(this.getWidth(), this.getHeight(), this.getSecondColor());
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
      border: 1px solid currentColor;
      border-radius: 25%;
    }

    .cell:hover {
      border: 1px solid yellow;
    }
    `;

    shadow.appendChild(style);

    this.renderCells();
  }

  clear() {
    this.cells = new CellsArray(this.getWidth(), this.getHeight(), this.getSecondColor());
    this._dispatchCellUpdate();
    this.renderCells();
  }

  fill(color) {
    this.cells = new CellsArray(this.getWidth(), this.getHeight(), color || this.getFirstColor());
    this._dispatchCellUpdate();
    this.renderCells();
  }

  dump() {
    return this.cells.dump(...arguments); 
  }

  load(v, s = false) {
    if (s) { v = JSON.parse(v); }
    this.setAttribute('height', v.height);
    this.setAttribute('width', v.width);
    this.cells = new CellsArray(v.width, v.height);
    this.cells.load(v);
    this.renderCells();
  }

  inverse() {
    this.cells.inverseValues();
    this._dispatchCellUpdate();
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
      cell.addEventListener('mouseenter', this.onCellMove);
      cell.addEventListener('click', this.onCellClick);

      this.paintCell(cell);

      cellContainer.appendChild(cell)
    }

    if (prevCellContainer) { 
      prevCellContainer.remove(); 
      const children = prevCellContainer.children;
      for (let i = 0; i < children.length; i++) {
        children[i].removeEventListener('mouseenter', this.onCellMove);
        children[i].removeEventListener('click', this.onCellClick);
      }
    }

    shadow.appendChild(cellContainer);
  }

  paintCell(cell) {
    cell.style.backgroundColor = this.cells[cell.dataset.id] || 'black';
  }

  selectCell(cell, button) {
    const cellId = cell.dataset.id;

    if (button === 0) {
      this.cells[cellId] = this.getFirstColor();
      //console.log('select', cellId);
      //cell.style.backgroundColor = 'red';

    } else if (button === 2) {
      this.cells[cellId] = this.getSecondColor();
      //console.log('DEselect', cellId);
      //cell.style.backgroundColor = 'black';
    }

    this.paintCell(cell);

    this._dispatchCellUpdate()
  }

  _dispatchCellUpdate() {
    this.dispatchEvent(new CustomEvent('cellupdate', {detail: {cells: this.cells}}));
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
    this.mouseDownButton = e.button;
    this.selectCell(this._lastCell, e.button);
  }
  onMouseUp(e) {
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
      // copy old data to new array
      const prevArray = this.cells;
      this.cells = new CellsArray(this.getWidth(), this.getHeight(), this.getSecondColor());
      this.cells.copy(prevArray);
      this._dispatchCellUpdate();
      this.renderCells();
    }
  }
});
