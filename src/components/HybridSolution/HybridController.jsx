export const HybridController = ({
  handleZoomIn,
  handleZoomOut,
  moveUp,
  moveDown,
  moveLeft,
  moveRight,
  scale,
  pan,
}) => {
  return (
    <div className="hybrid-controller__controls">
      <button
        onClick={handleZoomIn}
        className="hybrid-controller__button"
        style={{
          opacity: scale <= 1 && pan.x === 0 && pan.y === 0 ? 0.5 : 1,
        }}
      >
        +
      </button>
      <div className="hybrid-controller__direction-controls">
        <button
          onClick={moveUp}
          className="hybrid-controller__button"
          style={{
            opacity: scale <= 1 ? 0.5 : 1,
          }}
        >
          ↑
        </button>
        <div className="hybrid-controller__horizontal-controls">
          <button
            onClick={moveLeft}
            className="hybrid-controller__button"
            style={{
              opacity: scale <= 1 ? 0.5 : 1,
            }}
          >
            ←
          </button>
          <button
            onClick={moveRight}
            className="hybrid-controller__button"
            style={{
              opacity: scale <= 1 ? 0.5 : 1,
            }}
          >
            →
          </button>
        </div>
        <button
          onClick={moveDown}
          className="hybrid-controller__button"
          style={{
            opacity: scale <= 1 ? 0.5 : 1,
          }}
        >
          ↓
        </button>
      </div>
      <button
        onClick={handleZoomOut}
        className="hybrid-controller__button"
        style={{
          opacity: scale <= 1 && pan.x === 0 && pan.y === 0 ? 0.5 : 1,
        }}
      >
        -
      </button>
    </div>
  );
};
