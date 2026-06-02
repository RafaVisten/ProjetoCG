// Funções para desenhar na tela

var tela = document.getElementById("tela");
var c = tela.getContext("2d");

export function putpixel(x, y, color='white') {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), 3, 3);
}

// drawline drawline
export function drawline(x1, y1, x2, y2, color='white') {
    let dx = x2 - x1, dy = y2 - y1, x = x1, y = y1;
    var steps, k, incX, incY;

    steps = (Math.abs(dx) > Math.abs(dy)) ? Math.abs(dx) : Math.abs(dy);

    incX = dx / steps, incY = dy / steps;
    
    putpixel(x, y, color);
    for (let k=0;k<steps;k++) {
        x += incX, y += incY;
        putpixel(x, y, color);
    }
}

export function outlinePolygon(points, color='white') {
    let l = points.length;
    drawline(points[0][0], points[0][1], points[l-1][0], points[l-1][1]);
    for (let i=0;i<l-1;i++) {
        drawline(points[i][0], points[i][1], points[i+1][0], points[i+1][1], color);
    }
}

export function fillPolygon(points, line_color='white', fill_color='grey') {

    function globalTableInit(points) {
        let l = points.length;
        let edges = [];

        for (let i=0;i<l;i++) {
            if (i<l-1) k = i+1;
            else k = 0;

            if (points[i][1] === points[k][1]) continue; 

            edges.push({
                minY : Math.min(points[i][1], points[k][1]),
                maxY : Math.max(points[i][1], points[k][1]),
                x: (points[i][1] < points[k][1]) ? points[i][0] : points[k][0],
                invSlope: (points[k][0] - points[i][0]) / (points[k][1] - points[i][1])
            });
        }

        edges.sort((a, b) => {
            if (a.minY !== b.minY) return a.minY - b.minY;
            return a.x - b.x;
        });

        return edges;
    }

    function activeTableInit(g_table, scanline) {
        let a_table = []
        for (let edge of g_table) {
            if (edge.minY == scanline) {
                a_table.push({
                    maxY : edge.maxY,
                    x : edge.x,
                    invSlope : edge.invSlope
                });
            } else {
                break;
            }
        }

        a_table.sort((a, b) => a.x - b.x);

        return a_table;
    }

    let g_table = globalTableInit(points);
    let scanline = g_table[0].minY;
    let a_table = activeTableInit(g_table, scanline);
    let parity = 0;

    g_table = g_table.filter(edge => edge.minY !== scanline); // remove edges consumed
    
    while (a_table.length > 0) {

        a_table.sort((a, b) => a.x - b.x); // sort by x

        for (let i = 0; i < a_table.length; i += 2) {
            let x_start = Math.ceil(a_table[i].x);
            let x_end   = Math.floor(a_table[i + 1].x);

            for (let x = x_start; x <= x_end; x++) {
                putpixel(x, scanline, fill_color);
            }
        }
        scanline++;

        a_table = a_table.filter(edge => edge.maxY !== scanline); // remove edges

        for (let edge of a_table) edge.x += edge.invSlope; // update x


        let newEdges = [];
        for (let edge of g_table) {
            if (edge.minY === scanline) {
                newEdges.push({
                    maxY: edge.maxY,
                    x: edge.x,
                    invSlope: edge.invSlope
                });
            }
        }
        g_table = g_table.filter(edge => edge.minY !== scanline);
        a_table.push(...newEdges);
    }

    outlinePolygon(points, line_color);
}