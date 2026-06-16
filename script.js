import {Wireframe} from './utils/3d.js';

// setup

var tela = document.getElementById("tela");
var c = tela.getContext("2d");

var picker = document.getElementById("picker");

tela.width = window.innerWidth;
tela.height = window.innerHeight;

const max_x = tela.width-1;
const max_y = tela.height-1;

document.body.style.backgroundColor = "black";
document.body.style.color = "white";
document.getElementById("ajuda").style.display = "none";

function toggleHelp() {
    let ajuda = document.getElementById("ajuda");
    if (ajuda.style.display=="none") ajuda.style.display="block";
    else ajuda.style.display="none";
}

function cycleList(list, curr) {
    let len = list.length;
    let index = list.indexOf(curr);
    if (index == len-1) return list[0]
    else return list[index+1]
}

// main code

let object = await Wireframe.fromFile('./objects/figure.dat', null);
object[0].draw(tela.width, tela.height, 1, 'cavalier', 45);

// usa o file input pra mudar o objeto mostrado na tela
picker.addEventListener('change', (event) => {

    c.clearRect(0, 0, tela.width, tela.height);

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;

        object = Wireframe.fromFile(null, text);


        object[0].draw(tela.width, tela.height, 100, 'cavalier', 45);
    };

    reader.readAsText(file);
});

let mode='1', axis='x', proj='cavalier';
let MODO = { '1': 'Translação', '2': 'Rotação', '3': 'Escala' };
let PROJ = ['cavalier', 'cabinet', 'isometric', 'perspectivez', 'perspectivexz']

// recebe inputs do teclado
document.addEventListener('keydown', (e) => {

    if (!object) return;

    let press = e.key.toLowerCase();

    // modo de transformação: 1 - translação, 2 - rotação, 3 - escala
    if (['1', '2', '3'].includes(press)) {
        if (press != mode) {
            mode = press; 
            document.getElementById("modo").innerHTML = "Modo: "+MODO[press];

            console.log('mode: '+mode);
        }
    }
    
    // modo de eixo
    if(['4', '5', '6'].includes(press)) {
        if (press == '4') press = 'x';
        if (press == '5') press = 'y';
        if (press == '6') press = 'z';

        if (press != axis) {
            axis = press; 
            document.getElementById("eixo").innerHTML = "Eixo: "+press;

            console.log('axis: '+axis);
        }
    }

    // modo de projeção
    if (press == 'p') {
        proj = cycleList(PROJ, proj);
        document.getElementById("proj").innerHTML = "Projeção: "+proj;
        
        c.clearRect(0, 0, tela.width, tela.height);
        object[0].draw(tela.width, tela.height, 100, proj);
        c.stroke();
    }

    const bindings = {
        '+': () => object[0].applyDelta(mode, axis,  1),
        '-':  () => object[0].applyDelta(mode, axis,  -1),
        'F1': () => toggleHelp()
    };

    if (bindings[e.key]) {
        c.clearRect(0, 0, tela.width, tela.height);
        bindings[e.key]();
        object[0].draw(tela.width, tela.height, 100, proj);
        c.stroke();
    }
});

c.stroke();
