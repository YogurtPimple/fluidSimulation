const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d");
// canvas setup 
const dim = 500;
canvas.width = dim;
canvas.height = dim;

// flow grid setup
const N = 50;
const size = N * N;
const gridSpacing = dim / N;
const viscosity = 1 / 5; 	// kinematic viscosity coefficient in natural units
const omega = 1 / (3 * viscosity + 0.5);

// velocity directions,
const e = [
    [0, 0],                                  // N0
    [0, 1], [1, 0], [0, -1], [-1, 0],        // N, E, S, W
    [1, 1], [-1, 1], [-1, -1], [1, -1]       // NE, SE, SW, NW     
]

// weights 
const w = [
    4 / 9,                         // N0
    1 / 9, 1 / 9, 1 / 9, 1 / 9,    // N1, E2, S3, W4
    1 / 36, 1 / 36, 1 / 36, 1 / 36 // NE5, SE6, SW7, NW8
];


let meshGrid = new Array(size);

class Cell {
    constructor(index, rho, ux, uy, isbound, isinlet) {
        this.i = index;
        this.isbound = isbound;
        this.isinlet = isinlet;

        //macroscopic density and velocity
        this.rho = rho;
        this.ux = ux;
        this.uy = uy;

        this.Ni = [
            this.rho / 9, this.rho / 9, this.rho / 9, this.rho / 9,
            this.rho / 9, this.rho / 9, this.rho / 9, this.rho / 9,
            this.rho / 9];
        this.Neq;


    }

    get equilibrium() {

        let m = new Array(9);
        for (let i = 0; i < 9; i++) {
            m[i] = 1 + (3 * (dotMatrix(e[i], [this.ux, this.uy]))) +
                ((9 / 2) * dotMatrix(e[i], [this.ux, this.uy]) * dotMatrix(e[i], [this.ux, this.uy])) -
                ((3 / 2) * (Math.sqrt((this.ux * this.ux) + (this.uy * this.uy))))
        }
        let weightedRho = [];

        for (let i = 0; i < 9; i++) {
            weightedRho[i] = this.rho * w[i];
        }

        let n = [];
        for (let i = 0; i < 9; i++) {
            n[i] = m[i] * weightedRho[i];
        }
        return [...n]

    }

    stream() {
        if (this.isbound) return;
        let Nth = this.i - N, Est = this.i + 1, Sth = this.i + N, Wst = this.i - 1;


        // let rem = this.i%N; 
        // N E S W
        meshGrid[this.i].Ni[1] = tempGrid[Nth].Ni[1];
        meshGrid[this.i].Ni[2] = tempGrid[Est].Ni[2];
        meshGrid[this.i].Ni[3] = tempGrid[Sth].Ni[1];
        meshGrid[this.i].Ni[4] = tempGrid[Wst].Ni[4];

        // NE SE SW NW 
        meshGrid[this.i].Ni[5] = tempGrid[Nth + 1].Ni[5];
        meshGrid[this.i].Ni[6] = tempGrid[Sth + 1].Ni[6];
        meshGrid[this.i].Ni[7] = tempGrid[Sth - 1].Ni[7];
        meshGrid[this.i].Ni[8] = tempGrid[Nth - 1].Ni[8];

    }

    collide() {

        this.Neq = this.equilibrium;

        for (let i = 0; i < 9; i++) {
            this.Ni[i] = this.Ni[i] + omega * (this.Neq[i] - this.Ni[i]);
        }

        // get new macroscopic variables based on relaxation 
        this.rho = sumMatrix(this.Ni);
        this.ux = 0;
        this.uy = 0;

        this.Ni.forEach((n, i) => {
            this.ux += e[i][0] * n;
            this.uy += e[i][1] * n;
        });
        if (this.rho !== 0) {
            this.ux /= this.rho;
            this.uy /= this.rho;
        }
    }

}

for (let i = 0; i < size; i++) {
    meshGrid[i] = new Cell(i, 0, 1, 0, false, false);
}


function setBoundary() {
    for (let i = 0; i < N; i++) {
        meshGrid[IX(0, i)].isbound = true;
        meshGrid[IX(N - 1, i)].isbound = true;
        meshGrid[IX(i, N - 1)].isbound = true;
        meshGrid[IX(i, 0)].isbound = true;
    }

    // for (let i = 1; i < N / 3; i++) {
    //     meshGrid[IX(i, 20)].isbound = true;
    // }
}


function initialState() {
    for (let i = 1; i < N-1; i++) {
        for (let j = 1; j < 10; j++) {
            meshGrid[IX(i, j)].ux = 12;
        }
    }

}

setBoundary();

let tempGrid = [...meshGrid];

function updateGrid() {
    for (let i = 0; i < size; i++) {
        meshGrid[i].collide();
    }

    tempGrid = [...meshGrid];

    for (let i = 0; i < size; i++) {
        meshGrid[i].stream();
    }

    tempGrid = [...meshGrid];

}

function draw() {
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            let color;
            if (meshGrid[IX(i, j)].isbound) {
                ctx.fillStyle = `rgb(50, 50, 55)`;
            } else {
                color = Math.floor(255 - 1000000 * meshGrid[IX(i, j)].rho);
                ctx.fillStyle = `rgb(255, 255, ${color})`;
            }
            ctx.fillRect(i * gridSpacing, j * gridSpacing, gridSpacing, gridSpacing);
        }
    }
}

// initialState();
function mainloop() {
    updateGrid();
    draw();
    requestAnimationFrame(mainloop);
}

// setInterval(initialState, 1000);
// setInterval(mainloop, 1000);
// setInterval(draw, 800);
mainloop();

function multiplyMatrices(a, b) {
    return a.map((x, i) => { x * b[i] });
}

function sumMatrix(a) {
    return a.reduce((a, b) => a + b)

}
function scaleMatrix(scalar, array) {
    return array.map((x) => x * scalar);
}

function dotMatrix(a, b) {
    return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
}

function IX(i, j) {
    return i + N * j;
}



canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();

    let mouse = {
        i: Math.floor(e.offsetX / gridSpacing),
        j: Math.floor(e.offsetY / gridSpacing),
    };
    // check for boundaries
    if (mouse.i < 0) {
        mouse.i = 1;
    }
    if (mouse.i > N - 1) {
        mouse.i = N - 2;
    }
    if (mouse.j < 0) {
        mouse.j = 1;
    }
    if (mouse.j > N - 1) {
        mouse.j = N - 2;
    }

    meshGrid[IX(mouse.i, mouse.j)].rho = 1;
    console.log(meshGrid[IX(mouse.i, mouse.j)].Ni, meshGrid[IX(mouse.i -N , mouse.j)].Ni); 

});




