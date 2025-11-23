/**
 * Shape Overlay Component
 * Handles custom shape drawing for tour step highlights
 */

class ShapeOverlay {
    constructor(app) {
        this.app = app;
        this.previewCanvas = document.getElementById('overlayCanvas');
        this.modalCanvas = document.getElementById('shapeCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.modalCtx = this.modalCanvas.getContext('2d');

        this.enabled = false;
        this.shapeType = 'rectangle';
        this.strokeColor = '#4CAF50';
        this.fillOpacity = 0.2;

        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentShape = null;
        this.points = []; // For polygon/freeform

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modal canvas events
        this.modalCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.modalCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.modalCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.modalCanvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // Prevent context menu
        this.modalCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    enable() {
        this.enabled = true;
        this.previewCanvas.style.pointerEvents = 'auto';
        this.previewCanvas.style.cursor = 'crosshair';
    }

    disable() {
        this.enabled = false;
        this.previewCanvas.style.pointerEvents = 'none';
        this.previewCanvas.style.cursor = 'default';
    }

    setShapeType(type) {
        this.shapeType = type;
        this.points = [];
        this.currentShape = null;
        this.clearCanvas(this.modalCtx, this.modalCanvas);
    }

    setStrokeColor(color) {
        this.strokeColor = color;
        this.redraw();
    }

    setFillOpacity(opacity) {
        this.fillOpacity = opacity;
        this.redraw();
    }

    onMouseDown(e) {
        const rect = this.modalCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.startX = x;
        this.startY = y;

        if (this.shapeType === 'polygon') {
            this.points.push({ x, y });
        } else if (this.shapeType === 'freeform') {
            this.points = [{ x, y }];
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;

        const rect = this.modalCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.clearCanvas(this.modalCtx, this.modalCanvas);

        if (this.shapeType === 'rectangle') {
            this.drawRectangle(this.modalCtx, this.startX, this.startY, x - this.startX, y - this.startY);
        } else if (this.shapeType === 'circle') {
            const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
            this.drawCircle(this.modalCtx, this.startX, this.startY, radius);
        } else if (this.shapeType === 'freeform') {
            this.points.push({ x, y });
            this.drawFreeform(this.modalCtx, this.points);
        } else if (this.shapeType === 'polygon') {
            // Draw existing points and line to current position
            this.drawPolygonPreview(this.modalCtx, this.points, x, y);
        }
    }

    onMouseUp(e) {
        if (!this.isDrawing) return;

        const rect = this.modalCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.shapeType === 'rectangle') {
            this.currentShape = {
                type: 'rectangle',
                bounds: {
                    x: Math.min(this.startX, x),
                    y: Math.min(this.startY, y),
                    width: Math.abs(x - this.startX),
                    height: Math.abs(y - this.startY)
                }
            };
            this.isDrawing = false;
        } else if (this.shapeType === 'circle') {
            const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
            this.currentShape = {
                type: 'circle',
                center: { x: this.startX, y: this.startY },
                radius: radius
            };
            this.isDrawing = false;
        } else if (this.shapeType === 'freeform') {
            this.currentShape = {
                type: 'freeform',
                points: [...this.points]
            };
            this.isDrawing = false;
        }
        // Polygon continues until double-click
    }

    onDoubleClick(e) {
        if (this.shapeType === 'polygon' && this.points.length >= 3) {
            this.currentShape = {
                type: 'polygon',
                points: [...this.points]
            };
            this.isDrawing = false;
            this.points = [];
            this.redraw();
        }
    }

    drawRectangle(ctx, x, y, width, height) {
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fillStyle = this.hexToRgba(this.strokeColor, this.fillOpacity);
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawCircle(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(this.strokeColor, this.fillOpacity);
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawPolygonPreview(ctx, points, currentX, currentY) {
        if (points.length === 0) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = this.strokeColor;
            ctx.fill();
        });
    }

    drawPolygon(ctx, points) {
        if (points.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(this.strokeColor, this.fillOpacity);
        ctx.fill();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawFreeform(ctx, points) {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    clearCanvas(ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    clearShape() {
        this.currentShape = null;
        this.points = [];
        this.clearCanvas(this.modalCtx, this.modalCanvas);
    }

    redraw() {
        this.clearCanvas(this.modalCtx, this.modalCanvas);

        if (!this.currentShape) return;

        switch (this.currentShape.type) {
            case 'rectangle':
                this.drawRectangle(
                    this.modalCtx,
                    this.currentShape.bounds.x,
                    this.currentShape.bounds.y,
                    this.currentShape.bounds.width,
                    this.currentShape.bounds.height
                );
                break;
            case 'circle':
                this.drawCircle(
                    this.modalCtx,
                    this.currentShape.center.x,
                    this.currentShape.center.y,
                    this.currentShape.radius
                );
                break;
            case 'polygon':
                this.drawPolygon(this.modalCtx, this.currentShape.points);
                break;
            case 'freeform':
                this.drawFreeform(this.modalCtx, this.currentShape.points);
                break;
        }
    }

    loadShape(shapeData) {
        if (!shapeData) {
            this.currentShape = null;
            return;
        }

        this.currentShape = JSON.parse(JSON.stringify(shapeData));
        this.strokeColor = shapeData.style?.stroke || '#4CAF50';
        this.fillOpacity = shapeData.style?.fillOpacity || 0.2;

        // Update UI
        document.getElementById('strokeColor').value = this.strokeColor;
        document.getElementById('fillOpacity').value = this.fillOpacity * 100;
        document.getElementById('opacityValue').textContent = Math.round(this.fillOpacity * 100) + '%';

        // Select correct shape tool
        document.querySelectorAll('.shape-tool').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === this.currentShape.type);
        });

        this.redraw();
    }

    getShapeData() {
        if (!this.currentShape) return null;

        return {
            ...this.currentShape,
            style: {
                stroke: this.strokeColor,
                fillOpacity: this.fillOpacity
            }
        };
    }

    // Draw shape on preview canvas
    drawOnPreview(shapeData, elementRect) {
        if (!shapeData || !elementRect) return;

        this.clearCanvas(this.previewCtx, this.previewCanvas);

        const ctx = this.previewCtx;
        const offsetX = elementRect.left;
        const offsetY = elementRect.top;

        this.strokeColor = shapeData.style?.stroke || '#4CAF50';
        this.fillOpacity = shapeData.style?.fillOpacity || 0.2;

        switch (shapeData.type) {
            case 'rectangle':
                this.drawRectangle(
                    ctx,
                    offsetX + shapeData.bounds.x,
                    offsetY + shapeData.bounds.y,
                    shapeData.bounds.width,
                    shapeData.bounds.height
                );
                break;
            case 'circle':
                this.drawCircle(
                    ctx,
                    offsetX + shapeData.center.x,
                    offsetY + shapeData.center.y,
                    shapeData.radius
                );
                break;
            case 'polygon':
                const offsetPoints = shapeData.points.map(p => ({
                    x: offsetX + p.x,
                    y: offsetY + p.y
                }));
                this.drawPolygon(ctx, offsetPoints);
                break;
        }
    }

    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(76, 175, 80, ${alpha})`;
        return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
}
