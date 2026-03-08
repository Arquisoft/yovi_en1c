import './GameBoard.css';


function getBoardRowCount(size: 'small'): number {
    switch (size) {
        case 'small': return 7;
    }
}

function hexagonPoints(centerX: number, centerY: number, radius: number): string {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 180) * (60 * i + 30);
        return `${(centerX + radius * Math.cos(angle)).toFixed(2)},${(centerY + radius * Math.sin(angle)).toFixed(2)}`;
    }).join(' ');
}

export default function GameBoard({ onBack }: { onBack: () => void }) {
    const rowCount      = getBoardRowCount('small'); // number of rows on the board
    const hexRadius     = rowCount <= 7 ? 30 : rowCount <= 10 ? 25 : 20; // hex radius in px, decreases as the board grows
    const colSpacing    = hexRadius * Math.sqrt(3); // horizontal spacing between hexagons (pointy-top hex width)
    const rowSpacing    = hexRadius * 1.5;           // vertical spacing between rows (3/4 of hex height)
    const outerMargin   = hexRadius * 2.5;           // outer SVG margin so edge hexagons are not clipped

    const svgWidth  = outerMargin * 2 + (rowCount - 1) * colSpacing + colSpacing; // total SVG width
    const svgHeight = outerMargin * 2 + (rowCount - 1) * rowSpacing + hexRadius * 2; // total SVG height

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
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        style={{ display: 'block', width: '100%', height: 'auto' }}
                    >
                        {Array.from({ length: rowCount }, (_, row) =>
                            Array.from({ length: row + 1 }, (_, col) => {
                                const centerX = outerMargin + ((rowCount - 1 - row) * colSpacing / 2) + col * colSpacing + colSpacing / 2; // X center of hex (offset applied to center the triangle)
                                const centerY = outerMargin + row * rowSpacing + hexRadius; // Y center of hex

                                const defaultFill        = 'rgba(255,255,255,0.04)'; // default fill for interior cells
                                const defaultStroke      = 'rgba(0, 0, 0, 0.12)';   // default border color
                                const defaultStrokeWidth = 1;                         // default border width

                                return (
                                    <polygon
                                        key={`${row}-${col}`}
                                        points={hexagonPoints(centerX, centerY, hexRadius - 1)}
                                        fill={defaultFill}
                                        stroke={defaultStroke}
                                        strokeWidth={defaultStrokeWidth}
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