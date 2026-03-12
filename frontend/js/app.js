// 全局变量
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const hexDisplay = document.getElementById('hexDisplay');
const mainPreview = document.getElementById('mainPreview');

// 应用数据
let appData = { colors: [], customColors: [], symbols: {}, colorCategories: [] };

// 编辑器历史记录
let history = [editor.value], historyIndex = 0, isHistoryAction = false;

// 颜色选择器状态
let colorPickerHue = 0, colorPickerSat = 1, colorPickerLight = 0.5, isPickingColor = false;

// 分类状态
let currentColorCategory = '全部', draggedColorCard = null, draggedColorIndex = -1, draggedColorCategory = '';
let currentSymbolCategory = '常用', draggedSymbolCard = null, draggedSymbolIndex = -1, draggedSymbolCategory = '';

// 初始化应用
async function initApp() {
    try {
        if (!window.pywebview) return;
        const config = await window.pywebview.api.load_config();
        if (config) {
            appData.colors = config.colors || [];
            appData.customColors = config.customColors || [];
            appData.symbols = config.symbols || {};
            appData.colorCategories = config.colorCategories || [];
        }
        if (!appData.symbols['未分类']) appData.symbols['未分类'] = [];
        appData.customColors.forEach(c => { if (!c.category) c.category = '未分类'; });

        renderColorTabs(); renderLibrary(); renderSymbolTabs(); renderSymbols(); syncColor('#000000FF');
    } catch (e) { console.error("初始化失败:", e); }
}

// 保存数据到后端
async function saveToBackend() {
    try { if (window.pywebview && window.pywebview.api) await window.pywebview.api.save_config(appData); } catch (e) { console.error("保存失败:", e); }
}

// 编辑器核心功能
function render() {
    let content = editor.value.replace(/\\n/g, '\n').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    content = content.replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<strong>$1</strong>');
    content = content.replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<em>$1</em>');
    content = content.replace(/&lt;size=(\d+)&gt;([\s\S]*?)&lt;\/size&gt;/g, '<span style="font-size:$1px">$2</span>');
    content = content.replace(/&lt;color=(#?[0-9A-Fa-f]{6,8})&gt;([\s\S]*?)&lt;\/color&gt;/g, (match, color, text) => {
        let finalColor = color.length === 9 ? `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${(parseInt(color.slice(7, 9), 16) / 255).toFixed(2)})` : color;
        return `<span style="color:${finalColor}">${text}</span>`;
    });
    preview.innerHTML = content.replace(/\n/g, '<br>');
}

function saveHistory() { 
    if (isHistoryAction) return; 
    history = history.slice(0, historyIndex + 1); 
    history.push(editor.value); 
    historyIndex = history.length - 1; 
    if (history.length > 50) { history.shift(); historyIndex--; } 
}

function undo() { 
    if (historyIndex > 0) { 
        isHistoryAction = true; 
        historyIndex--; 
        editor.value = history[historyIndex]; 
        render(); 
        setTimeout(() => { isHistoryAction = false; }, 100); 
    } 
}

function redo() { 
    if (historyIndex < history.length - 1) { 
        isHistoryAction = true; 
        historyIndex++; 
        editor.value = history[historyIndex]; 
        render(); 
        setTimeout(() => { isHistoryAction = false; }, 100); 
    } 
}

function wrap(start, end) { 
    const s = editor.selectionStart, e = editor.selectionEnd; 
    editor.value = editor.value.substring(0, s) + start + editor.value.substring(s, e) + end + editor.value.substring(e); 
    editor.focus(); 
    saveHistory(); 
    render(); 
}

function applySize() {
    const sizeInput = document.getElementById('sizeInput');
    if (!sizeInput) return;

    const sizeValue = sizeInput.value;
    const s = editor.selectionStart, e = editor.selectionEnd;

    if (s === e) {
        wrap(`<size=${sizeValue}>`, `</size>`);
        return;
    }

    const selected = editor.value.substring(s, e);

    const newText = /<size=\d+>/g.test(selected)
        ? selected.replace(/<size=\d+>/g, `<size=${sizeValue}>`)
        : `<size=${sizeValue}>${selected}</size>`;

    editor.value = editor.value.substring(0, s) + newText + editor.value.substring(e);

    editor.focus();
    saveHistory();
    render();
}

function applyColor() { 
    const s = editor.selectionStart, e = editor.selectionEnd; 
    if (s === e) { 
        wrap(`<color=${hexDisplay.value}>`, `</color>`); 
        return; 
    } 
    const selected = editor.value.substring(s, e); 
    const newText = /<color=#?[0-9A-Fa-f]{6,8}>/g.test(selected) ? selected.replace(/<color=#?[0-9A-Fa-f]{6,8}>/g, `<color=${hexDisplay.value}>`) : `<color=${hexDisplay.value}>${selected}</color>`; 
    editor.value = editor.value.substring(0, s) + newText + editor.value.substring(e); 
    editor.focus(); 
    saveHistory(); 
    render(); 
}

const selectAll = () => { editor.select(); editor.focus(); };

function removeFormat() { 
    const s = editor.selectionStart, e = editor.selectionEnd; 
    if (s === e) return; 
    const selected = editor.value.substring(s, e); 
    const cleanText = selected.replace(/<\/?b>/gi, '').replace(/<\/?i>/gi, '').replace(/<size=\d+>|<\/size>/gi, '').replace(/<color=#?[0-9A-Fa-f]{6,8}>|<\/color>/gi, ''); 
    editor.value = editor.value.substring(0, s) + cleanText + editor.value.substring(e); 
    editor.focus(); 
    saveHistory(); 
    render(); 
}

// 颜色管理功能
function syncColor(hex) { 
    hexDisplay.value = hex; 
    mainPreview.style.backgroundColor = hex; 
    document.getElementById('curColorHex').innerText = hex; 
    if (hex.length === 9) { 
        document.getElementById('r').value = parseInt(hex.slice(1, 3), 16); 
        document.getElementById('g').value = parseInt(hex.slice(3, 5), 16); 
        document.getElementById('b').value = parseInt(hex.slice(5, 7), 16); 
        document.getElementById('a').value = parseInt(hex.slice(7, 9), 16); 
    } 
}

function handleColorPicker(color) { 
    syncColor(`#${color.slice(1, 3)}${color.slice(3, 5)}${color.slice(5, 7)}FF`.toUpperCase()); 
}

function openColorPicker() { 
    document.getElementById('colorPickerPanel').classList.add('show'); 
    initColorPicker(); 
}

function closeColorPicker() { 
    document.getElementById('colorPickerPanel').classList.remove('show'); 
}

async function pickScreenColor() { 
    if (!window.EyeDropper) { 
        alert('环境不支持屏幕取色'); 
        return; 
    } 
    const eyeDropper = new EyeDropper(); 
    try { 
        document.getElementById('colorPickerPanel').classList.remove('show'); 
        const result = await eyeDropper.open(); 
        let hex = result.sRGBHex.toUpperCase(); 
        if (hex.length === 7) hex += 'FF'; 
        syncColor(hex); 
        document.getElementById('colorPickerPanel').classList.add('show'); 
        const rgb = hexToRgb(hex); 
        if (rgb) { 
            const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b); 
            colorPickerHue = hsl.h; 
            colorPickerSat = hsl.s; 
            colorPickerLight = hsl.l; 
            const ctx = document.getElementById('colorPickerCanvas').getContext('2d'); 
            drawColorPickerCanvas(ctx, 300, 200); 
        } 
    } catch (e) { 
        document.getElementById('colorPickerPanel').classList.add('show'); 
    } 
}

function confirmColorPicker() { 
    const color = hslToRgbHex(colorPickerHue / 360, colorPickerSat, colorPickerLight); 
    syncColor(color + 'FF'); 
    closeColorPicker(); 
}

function initColorPicker() { 
    const canvas = document.getElementById('colorPickerCanvas'); 
    const ctx = canvas.getContext('2d'); 
    const container = document.getElementById('colorPickerCanvasContainer'); 
    canvas.width = container.offsetWidth; 
    canvas.height = container.offsetHeight; 
    drawColorPickerCanvas(ctx, canvas.width, canvas.height); 
    canvas.addEventListener('mousedown', (e) => { 
        isPickingColor = true; 
        updateColorFromCanvas(e, canvas, ctx); 
    }); 
    canvas.addEventListener('mousemove', (e) => { 
        if (isPickingColor) updateColorFromCanvas(e, canvas, ctx); 
    }); 
    canvas.addEventListener('mouseup', () => { isPickingColor = false; }); 
    canvas.addEventListener('mouseleave', () => { isPickingColor = false; }); 
    const hueSlider = document.getElementById('hueSlider'); 
    hueSlider.addEventListener('click', (e) => { 
        const rect = hueSlider.getBoundingClientRect(); 
        colorPickerHue = ((e.clientX - rect.left) / rect.width) * 360; 
        drawColorPickerCanvas(ctx, canvas.width, canvas.height); 
        updatePreviewColor(); 
    }); 
}

function drawColorPickerCanvas(ctx, width, height) { 
    for (let x = 0; x < width; x++) { 
        for (let y = 0; y < height; y++) { 
            const sat = x / width; 
            const light = 1 - (y / height); 
            const rgb = hslToRgb(colorPickerHue / 360, sat, light); 
            ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; 
            ctx.fillRect(x, y, 1, 1); 
        } 
    } 
}

function updateColorFromCanvas(e, canvas, ctx) { 
    const rect = canvas.getBoundingClientRect(); 
    colorPickerSat = Math.max(0, Math.min(canvas.width, e.clientX - rect.left)) / canvas.width; 
    colorPickerLight = 1 - (Math.max(0, Math.min(canvas.height, e.clientY - rect.top)) / canvas.height); 
    updatePreviewColor(); 
}

function updatePreviewColor() { 
    const rgb = hslToRgb(colorPickerHue / 360, colorPickerSat, colorPickerLight); 
    mainPreview.style.backgroundColor = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}FF`.toUpperCase(); 
}

function hslToRgbHex(h, s, l) { 
    const rgb = hslToRgb(h, s, l); 
    return `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`.toUpperCase(); 
}

function hexToRgb(hex) { 
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex); 
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null; 
}

function rgbToHsl(r, g, b) { 
    r /= 255; g /= 255; b /= 255; 
    const max = Math.max(r, g, b), min = Math.min(r, g, b); 
    let h, s, l = (max + min) / 2; 
    if (max !== min) { 
        const d = max - min; 
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min); 
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0); 
        else if (max === g) h = (b - r) / d + 2; 
        else h = (r - g) / d + 4; 
        h /= 6; 
    } 
    return { h: h * 360, s: s || 0, l: l }; 
}

function hslToRgb(h, s, l) { 
    let r, g, b; 
    if (s === 0) { 
        r = g = b = l; 
    } else { 
        const hue2rgb = (p, q, t) => { 
            if (t < 0) t += 1; 
            if (t > 1) t -= 1; 
            if (t < 1 / 6) return p + (q - p) * 6 * t; 
            if (t < 1 / 2) return q; 
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; 
            return p; 
        }; 
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s; 
        const p = 2 * l - q; 
        r = hue2rgb(p, q, h + 1 / 3); 
        g = hue2rgb(p, q, h); 
        b = hue2rgb(p, q, h - 1 / 3); 
    } 
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }; 
}

// 色库管理
function renderColorTabs() {
    const tabs = document.getElementById('colorTabs'); tabs.innerHTML = '';
    let otherCategories = [...new Set([...appData.colors.map(c => c.category), ...appData.customColors.map(c => c.category || '未分类'), ...appData.colorCategories])].sort();
    let categories = ['全部', ...otherCategories];

    categories.forEach(cat => {
        const tab = document.createElement('button'); tab.className = 'color-tab' + (cat === currentColorCategory ? ' active' : ''); tab.textContent = cat;
        tab.onclick = (e) => { if (!e.target.classList.contains('tab-del-btn')) { currentColorCategory = cat; renderColorTabs(); renderLibrary(); } };
        tab.addEventListener('dragover', e => { if (draggedColorCard && cat !== '全部') { e.preventDefault(); tab.classList.add('drag-over'); } });
        tab.addEventListener('dragleave', () => tab.classList.remove('drag-over'));
        tab.addEventListener('drop', e => { e.preventDefault(); tab.classList.remove('drag-over'); if (draggedColorCard) moveColorToCategory(draggedColorIndex, cat); });

        if (cat !== '全部') {
            const del = document.createElement('span');
            del.className = 'tab-del-btn';
            del.textContent = '×';
            del.onclick = (e) => {
                e.stopPropagation();
                deleteColorCategory(cat);
            };
            tab.appendChild(del);
        }
        tabs.appendChild(tab);
    });
    const add = document.createElement('button'); add.className = 'tab-add-btn'; add.textContent = '+'; add.onclick = () => { const n = prompt('分类名'); if (n) addColorCategory(n); }; tabs.appendChild(add);
}

function addColorCategory(name) { 
    if (!appData.colorCategories.includes(name)) appData.colorCategories.push(name); 
    saveToBackend(); 
    renderColorTabs(); 
}

function deleteColorCategory(name) {
    appData.colorCategories = appData.colorCategories.filter(c => c !== name);
    appData.customColors.forEach(c => { if (c.category === name) c.category = '未分类'; });
    appData.colors.forEach(c => { if (c.category === name) c.category = '未分类'; });

    saveToBackend();
    if (currentColorCategory === name) currentColorCategory = '未分类';
    renderColorTabs();
    renderLibrary();
}

function renderLibrary() {
    const lib = document.getElementById('colorLibrary'); lib.innerHTML = '';
    let colors = [...appData.colors, ...appData.customColors];
    if (currentColorCategory !== '全部') colors = colors.filter(c => (c.category || '未分类') === currentColorCategory);
    window.currentAllColors = colors;
    colors.forEach((c, i) => {
        const div = document.createElement('div'); div.className = 'color-card'; div.draggable = true; div.innerHTML = `<div class="card-swatch" style="background:${c.hex}"></div><div class="card-info"><b>${c.hex}</b><br><span>${c.note}</span></div><div class="card-del" onclick="deleteColor(${i})">×</div>`;
        div.onclick = (e) => { if (!e.target.classList.contains('card-del')) syncColor(c.hex); };
        div.ondragstart = (e) => { draggedColorCard = div; draggedColorIndex = i; draggedColorCategory = c.category || '未分类'; e.dataTransfer.setData('t', ''); };
        div.ondragover = (e) => { e.preventDefault(); if (draggedColorCard !== div) div.classList.add('drag-over'); };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => { e.preventDefault(); div.classList.remove('drag-over'); if (draggedColorCard !== div) moveColorCard(draggedColorIndex, i); };
        lib.appendChild(div);
    });
}

function moveColorCard(from, to) { 
    const arr = window.currentAllColors; 
    const item = arr[from]; 
    if (appData.colors.includes(item)) return; 
    const realFrom = appData.customColors.indexOf(item); 
    const realTo = appData.customColors.indexOf(arr[to]); 
    if (realFrom > -1 && realTo > -1) { 
        appData.customColors.splice(realTo, 0, appData.customColors.splice(realFrom, 1)[0]); 
        saveToBackend(); 
        renderLibrary(); 
    } 
}

function moveColorToCategory(idx, cat) { 
    const item = window.currentAllColors[idx]; 
    if (appData.colors.includes(item)) { 
        appData.colors = appData.colors.filter(c => c !== item); 
        appData.customColors.push({ ...item, category: cat }); 
    } else { 
        item.category = cat; 
    } 
    saveToBackend(); 
    renderColorTabs(); 
    renderLibrary(); 
}

function saveCustomColor() { 
    const n = prompt('备注'); 
    if (n) { 
        appData.customColors.push({ hex: hexDisplay.value, note: n, category: '未分类' }); 
        saveToBackend(); 
        renderLibrary(); 
    } 
}

function deleteColor(idx) {
    const item = window.currentAllColors[idx];
    if (appData.colors.includes(item)) appData.colors = appData.colors.filter(c => c !== item);
    else appData.customColors = appData.customColors.filter(c => c !== item);
    saveToBackend();
    renderLibrary();
}

// 符号库管理
function renderSymbolTabs() {
    const tabs = document.getElementById('symbolTabs'); tabs.innerHTML = '';
    let cats = Object.keys(appData.symbols).filter(k => k !== '未分类').sort();
    if (appData.symbols['未分类']) cats.push('未分类');
    if (!appData.symbols[currentSymbolCategory]) currentSymbolCategory = cats[0] || '未分类';
    cats.forEach(cat => {
        const tab = document.createElement('button'); tab.className = 'symbol-tab' + (cat === currentSymbolCategory ? ' active' : ''); tab.textContent = cat;
        tab.onclick = (e) => { if (!e.target.classList.contains('tab-del-btn')) { currentSymbolCategory = cat; renderSymbolTabs(); renderSymbols(); } };
        tab.ondragover = (e) => { if (draggedSymbolCard && cat !== draggedSymbolCategory) { e.preventDefault(); tab.classList.add('drag-over'); } };
        tab.ondragleave = () => tab.classList.remove('drag-over');
        tab.ondrop = (e) => { e.preventDefault(); tab.classList.remove('drag-over'); if (draggedSymbolCard) moveSymbolToCategory(draggedSymbolIndex, cat); };
        const del = document.createElement('span'); del.className = 'tab-del-btn'; del.textContent = '×'; del.onclick = (e) => { e.stopPropagation(); if (confirm('删除分类?')) { delete appData.symbols[cat]; saveToBackend(); renderSymbolTabs(); renderSymbols(); } };
        tab.appendChild(del); tabs.appendChild(tab);
    });
    const add = document.createElement('button'); add.className = 'tab-add-btn'; add.textContent = '+'; add.onclick = () => { const n = prompt('分类名'); if (n && !appData.symbols[n]) { appData.symbols[n] = []; saveToBackend(); renderSymbolTabs(); } }; tabs.appendChild(add);
}

function renderSymbols() {
    const list = document.getElementById('symbolList'); list.querySelectorAll('.symbol-card').forEach(e => e.remove());
    (appData.symbols[currentSymbolCategory] || []).forEach((s, i) => {
        const div = document.createElement('div'); div.className = 'symbol-card'; div.draggable = true; div.innerHTML = `<div class="symbol-char" onclick="insertChar('${s}')">${s}</div><div class="symbol-ops"><span class="op-btn" onclick="event.stopPropagation();moveSymbol(${i},-1)">◀</span><span class="op-btn op-del" onclick="event.stopPropagation();removeSymbol(${i})">×</span><span class="op-btn" onclick="event.stopPropagation();moveSymbol(${i},1)">▶</span></div>`;
        div.ondragstart = (e) => { draggedSymbolCard = div; draggedSymbolIndex = i; draggedSymbolCategory = currentSymbolCategory; e.dataTransfer.setData('t', s); };
        div.ondragover = (e) => { e.preventDefault(); if (draggedSymbolCard !== div && draggedSymbolCategory === currentSymbolCategory) div.classList.add('drag-over'); };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => { e.preventDefault(); div.classList.remove('drag-over'); if (draggedSymbolCard !== div && draggedSymbolCategory === currentSymbolCategory) moveSymbolIdx(draggedSymbolIndex, i); };
        list.insertBefore(div, list.lastElementChild);
    });
}

function moveSymbolIdx(from, to) { 
    const arr = appData.symbols[currentSymbolCategory]; 
    arr.splice(to, 0, arr.splice(from, 1)[0]); 
    saveToBackend(); 
    renderSymbols(); 
}

function moveSymbolToCategory(idx, cat) { 
    const s = appData.symbols[draggedSymbolCategory].splice(idx, 1)[0]; 
    appData.symbols[cat].push(s); 
    saveToBackend(); 
    if (currentSymbolCategory === draggedSymbolCategory) renderSymbols(); 
}

function insertChar(s) { 
    const p = editor.selectionStart; 
    editor.value = editor.value.slice(0, p) + s + editor.value.slice(editor.selectionEnd); 
    editor.focus(); 
    saveHistory(); 
    render(); 
}

function addNewSymbol() { 
    const s = prompt('符号'); 
    if (s) { 
        appData.symbols['未分类'].push(s); 
        currentSymbolCategory = '未分类'; 
        saveToBackend(); 
        renderSymbolTabs(); 
        renderSymbols(); 
    } 
}

function removeSymbol(i) { 
    appData.symbols[currentSymbolCategory].splice(i, 1); 
    saveToBackend(); 
    renderSymbols(); 
}

function moveSymbol(i, d) { 
    const arr = appData.symbols[currentSymbolCategory], t = i + d; 
    if (t >= 0 && t < arr.length) { 
        [arr[i], arr[t]] = [arr[t], arr[i]]; 
        saveToBackend(); 
        renderSymbols(); 
    } 
}

// 背景管理
function changePreviewBg(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('preview');
            preview.style.backgroundImage = `url('${e.target.result}')`;
            preview.style.borderStyle = 'solid';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function resetBg() {
    const preview = document.getElementById('preview');
    preview.style.backgroundImage = 'none';
    preview.style.backgroundColor = '#fff';
    preview.style.borderStyle = 'dashed';
    document.getElementById('bgInput').value = '';
}

// 符号库模态框
function toggleSymbolModal() {
    const modal = document.getElementById('symbolModal');
    const isVisible = modal.style.display === 'flex';
    modal.style.display = isVisible ? 'none' : 'flex';
}

// 拖拽功能
function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById(elmnt.id + "Header");

    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 默认颜色管理
function updateDefaultColor(val) {
    const previewArea = document.getElementById('preview');
    const colorDot = document.getElementById('colorDot');
    const finalColor = val.trim() || '#000000';

    previewArea.style.color = finalColor;
    colorDot.style.backgroundColor = finalColor;
}

// 事件监听器
function initEventListeners() {
    // 颜色滑块事件
    ['r', 'g', 'b', 'a'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const r = parseInt(document.getElementById('r').value).toString(16).padStart(2, '0');
            const g = parseInt(document.getElementById('g').value).toString(16).padStart(2, '0');
            const b = parseInt(document.getElementById('b').value).toString(16).padStart(2, '0');
            const a = parseInt(document.getElementById('a').value).toString(16).padStart(2, '0');
            syncColor(`#${r}${g}${b}${a}`.toUpperCase());
        });
    });

    // HEX输入事件
    hexDisplay.addEventListener('input', () => {
        let hex = hexDisplay.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) hex += 'FF';
        if (/^#[0-9A-Fa-f]{8}$/.test(hex)) syncColor(hex.toUpperCase());
    });

    // 编辑器输入事件
    let historyTimeout;
    editor.addEventListener('input', () => {
        render();
        clearTimeout(historyTimeout);
        historyTimeout = setTimeout(saveHistory, 500);
    });

    // 编辑器键盘事件
    editor.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'j') {
            e.preventDefault();
            const s = editor.selectionStart;
            const ePos = editor.selectionEnd;
            editor.value = editor.value.substring(0, s) + "\n" + editor.value.substring(ePos);
            editor.selectionStart = editor.selectionEnd = s + 1;
            editor.focus();
            saveHistory();
            render();
        }

        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); wrap('<b>', '</b>'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); wrap('<i>', '</i>'); }
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); redo(); }
        if (e.ctrlKey && e.altKey && e.key === 's') { e.preventDefault(); applySize(); }
        if (e.ctrlKey && e.altKey && e.key === 'c') { e.preventDefault(); applyColor(); }
    });

    // 符号库拖拽
    dragElement(document.getElementById("symbolModal"));

    // PyWebView初始化
    window.addEventListener('pywebviewready', initApp);
}

// 初始化
window.onload = function() {
    initEventListeners();
};