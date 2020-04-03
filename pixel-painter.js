

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

  copyFrom(another) {
    for (let y = 0; y < Math.min(this.height, another.height); y++) {
      for (let x = 0; x < Math.min(this.width, another.width); x++) {
        this.set(x, y, another.get(x, y));
      }
    }
  }

  copy() {
    const r = new CellsArray(this.w, this.h);
    r.splice(0, this.length, ...this);
    return r;
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
    const fs = 'onCellClick onCellMove onCellLeave onMouseDown onMouseUp onMouseScroll'.split(' ');
    for (let i = 0; i < fs.length; i++) {
      const fn = fs[i];
      this[fn] = this[fn].bind(this);
    }

    this.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);

    this.addEventListener('mousemove', this.onMouseScroll);


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

  onMouseScroll() {

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
    this._dispatchCellUpdate();
  }

  inverse() {
    this.cells.inverseValues();
    this._dispatchCellUpdate();
    this.renderCells();
  }

  renderCells() {

    const prevCellContainer = this.shadowRoot.querySelector('.wrapper');

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
      cell.addEventListener('mouseleave', this.onCellLeave);
      cell.addEventListener('click', this.onCellClick);

      this.paintCell(cell);

      cellContainer.appendChild(cell)
    }

    if (prevCellContainer) { 
      prevCellContainer.remove(); 
      const children = prevCellContainer.children;
      for (let i = 0; i < children.length; i++) {
        children[i].removeEventListener('mouseenter', this.onCellMove);
        children[i].removeEventListener('mouseleave', this.onCellLeave);
        children[i].removeEventListener('click', this.onCellClick);
      }
    }

    this.shadowRoot.appendChild(cellContainer);
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

  onCellLeave(e) {
    if (this.mouseDownButton !== null) {
      this.selectCell(e.target, this.mouseDownButton);
    }
    this._lastCell = null;
  }

  onMouseDown(e) {
    this.mouseDownButton = e.button;
    if (this._lastCell) {
      this.selectCell(this._lastCell, e.button);
    }
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
      // copyFrom old data to new array
      const prevArray = this.cells;
      this.cells = new CellsArray(this.getWidth(), this.getHeight(), this.getSecondColor());
      this.cells.copyFrom(prevArray);
      this._dispatchCellUpdate();
      this.renderCells();
    }
  }
});




customElements.define('font-map', class FontMap extends HTMLElement {

  static get observedAttributes() {
    return ['char-width', 'char-height'];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    // if (oldValue === newValue || oldValue === null) {
    //   return;
    // }
    if (['char-width', 'char-height'].includes(name)) {
      this.shadowRoot.querySelector(`input[name="${name.replace('char-', '')}"]`).value = newValue;
    }
  }

  getCharWidth() {
    return parseInt(this.getAttribute('char-width')) || 10;
  }
  getCharHeight() {
    return parseInt(this.getAttribute('char-height')) || 12;
  }
  constructor() {
    super();

    this._prevSelected = null;
    this.selectedCharId = null;

    this.pixelPainter = document.getElementById(this.getAttribute('for'));

    this.charMap = (this.getAttribute('char-map') || ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}').split('');

    this.charCells = new Array(this.charMap.length);
    for (let i = 0; i < this.charCells.length; i++) {
        this.charCells[i] = new CellsArray(this.getCharWidth(), this.getCharHeight(), '#000000');
        this.charCells[i].char = this.charMap[i];
    }

    this.onCellClick = this.onCellClick.bind(this);
    this.onCellUpdate = this.onCellUpdate.bind(this);
    this.onSizeChange = this.onSizeChange.bind(this);

    if (this.pixelPainter) {
      this.pixelPainter.addEventListener('cellupdate', this.onCellUpdate);
    }

    const shadow = this.attachShadow({mode: 'open'});
    
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
      grid-template-columns: repeat(12, 1fr);
    }

    .sizes {
      background-color: lightblue;
      grid-column: span 12;
      display: flex;
    }

    .sizes > label {
      flex-grow: 1;
      margin-left: 5px;
    }

    .sizes > label > input {
      width: 100px;
      float: right:
    }

    .cell {
      font-size: 1rem;
      border: 1px solid currentColor;
      border-radius: 25%;
      text-align: center;
      background-color: white;
      color: black;
    }

    .cell:hover {
      border: 1px solid yellow;
    }

    .cell[data-selected=true] {
      color: white;
      background-color: black;
    }
    `;

    shadow.appendChild(style);

    const container = document.createElement('div');
    container.classList.toggle('wrapper');

    const fontSizeForm = document.createElement('form');

    fontSizeForm.innerHTML = `
<label>width: 
<input name="width" value="${this.getCharWidth()}" type="number">
</label>
<label>height: 
<input name="height" value="${this.getCharHeight()}" type="number">
</label>
`;
    fontSizeForm.classList.toggle('sizes');
    fontSizeForm.addEventListener('change', this.onSizeChange);

    container.appendChild(fontSizeForm);

    this._cellElements = this.charMap.map((char, i) => {
      const cell = document.createElement('button');

      cell.classList.toggle('cell');
      cell.dataset.id = i;
      cell.innerText = char;
      // cell.style.backgroundColor = randomColor();
      cell.addEventListener('click', this.onCellClick);

      container.appendChild(cell);

      return cell;
    });

    shadow.appendChild(container);
  }

  load(v, s = false) {
    if (s) { v = JSON.parse(v); }
    this.charMap = v.charMap;
    this.setAttribute('char-width', v.charWidth);
    this.setAttribute('char-height', v.charHeight);
    this.charCells = v.charCells.map((e, i) => { 
      const cells = new CellsArray(e.width, e.height); 
      cells.load(e); 
      cells.char = v.charMap[i]; 
      return cells; 
    });
    if (this.pixelPainter && v.selectedCharId !== null) {
      this._selectCharById(v.selectedCharId);
    }
  }

  dump(s = false) {
    const v = {
      charMap: this.charMap,
      charWidth: this.getCharWidth(),
      charHeight: this.getCharHeight(),
      charCells: this.charCells.map(e => e.dump(false)),
      selectedCharId: this.selectedCharId,
    };
    if (s) { return JSON.stringify(v); }
    return v;
  }

  onSizeChange(e) {
    const { target } = e;

    this.setAttribute('char-'+target.name, target.value);

    for (let i = 0; i < this.charCells.length; i++) {
      const newCells = new CellsArray(this.getCharWidth(), this.getCharHeight(), '#000000');
      newCells.copyFrom(this.charCells[i]);
      newCells.char = this.charMap[i];
      this.charCells[i] = newCells;
    }

    if (this.pixelPainter && this.selectedCharId !== null) {
      this._selectCharById(this.selectedCharId);
    }

    this._dispatchCharMapUpdated();
  }

  onCellUpdate(e) {
    if (this.selectedCharId) {
      this.charCells[this.selectedCharId] = e.detail.cells.copy();
      this.charCells[this.selectedCharId].char = this.charMap[this.selectedCharId];
    }
  }

  _dispatchCharMapUpdated() {
    this.dispatchEvent(new CustomEvent('charmapupdate', {detail: {charWidth: this.getCharWidth(), charHeight: this.getCharHeight(), charCells: this.charCells}}));
  }


  onCellClick(e) {
    if (this.pixelPainter) {
      if (this._prevSelected) {
        this._prevSelected.dataset.selected = undefined;
        if (this._prevSelected.dataset.id === e.target.dataset.id) {
          this._prevSelected = null;
          this.selectedCharId = null;
          return;
        }
      }

      this._prevSelected = e.target;
      this._selectCharById(e.target.dataset.id);
    }
  }

  _selectCharById(id) {
    const cellEl = this._cellElements[id];
    cellEl.dataset.selected = true;
    this._prevSelected = cellEl;
    this.selectedCharId = id;
    this.pixelPainter.removeEventListener('cellupdate', this.onCellUpdate);
    this.pixelPainter.load(this.charCells[id].dump());
    this.pixelPainter.addEventListener('cellupdate', this.onCellUpdate);
  }
});


