import './GameBoard.css';


function getBoardN(size: 'small'): number {
    switch (size) {
        case 'small':  return 7;
    }
}

function hexPoints(cx: number, cy: number, r: number): string {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i + 30);
        return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
}

export default function GameBoard({onBack }: { onBack: () => void }) {
    const n  = getBoardN('small'); // número de filas del tablero (ej: 13 para large)
    const R  = n <= 7 ? 30 : n <= 10 ? 25 : 20; // radio de cada hexágono en px, decrece al aumentar el tablero
    const SX = R * Math.sqrt(3); // separación horizontal entre hexágonos (ancho de hex punta-arriba)
    const SY = R * 1.5;          // separación vertical entre filas (3/4 de la altura del hex)
    const M  = R * 2.5;          // margen exterior del SVG para que los bordes no queden cortados

    const svgW = M * 2 + (n - 1) * SX + SX; // anchura total del SVG
    const svgH = M * 2 + (n - 1) * SY + R * 2; // altura total del SVG

    return (
        <div className="board">
            <div className="boardCard">

                <div className="boardHeader">
                    <button className="btn" type="button" onClick={onBack}>← Back</button>
                    <h2 className="boardTitle">Game Y</h2>
                    <div style={{ width: 80 }} />
                </div>

                <div className="boardMeta">
                    <span className="infoTag">Mode: standard</span>
                    <span className="infoTag">Size: small</span>
                    <span className="infoTag">Layout: default</span>
                </div>

                <div className="svgWrapper">
                    <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        style={{ display: 'block', width: '100%', height: 'auto' }}
                    >
                        {Array.from({ length: n }, (_, row) =>
                            Array.from({ length: row + 1 }, (_, col) => {
                                const cx = M + ((n - 1 - row) * SX / 2) + col * SX + SX / 2; // posición X del centro del hex (con offset para centrar la pirámide)
                                const cy = M + row * SY + R; // posición Y del centro del hex

                                let fill    = 'rgba(255,255,255,0.04)'; // relleno por defecto (celda interior)
                                let stroke  = 'rgba(0, 0, 0, 0.12)'; // borde por defecto
                                let strokeW = 1;                        // grosor de borde por defecto

                                return (
                                    <polygon
                                        key={`${row}-${col}`}
                                        points={hexPoints(cx, cy, R - 1)}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={strokeW}
                                    />
                                );
                            })
                        )}
                    </svg>
                </div>

            </div>
        </div>
    );
}