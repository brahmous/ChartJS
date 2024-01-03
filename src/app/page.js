'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import axios from 'axios';

export default function Chart() {
  const canvas_ref = useRef();
  const [candles, setCandles] = useState([]);
  const [state, setState] = useState({
    mouse_down: false,
    click_position: {
      x: 0,
      y: 0,
    },
    initialized: false,
    canvas_dimensions: {
      width: 0,
      height: 0,
    },
    origin_offset: {
      x: 0,
      y: 0,
    },
    tick_size: {
      x: 1,
      y: 0.001,
    },
    scale: {
      x: 50,
      y: 50000,
    },
    offset: {
      x: 0,
      y: 0,
    },
    candle_stick_settings: {
      time_frame: 5,
    },
  });

  function wtos(point) {
    return {
      x: state.origin_offset.x + state.offset.x + point.x * state.scale.x,
      y: state.origin_offset.y + state.offset.y - point.y * state.scale.y,
    };
  }
  function stow(point) {
    return {
      x: (point.x - (state.origin_offset.x + state.offset.x)) / state.scale.x,
      y: (state.origin_offset.y + state.offset.y - point.y) / state.scale.y,
    };
  }

  function generate_ticks(axis) {
    const ticks = [];
    if (axis == 'x') {
      const origin_world = stow({ x: 0, y: 0 });
      const first_tick = origin_world.x - (origin_world.x % state.tick_size.x);
      for (
        let i = first_tick;
        i < stow({ x: state.canvas_dimensions.width, y: 0 }).x;
        i += state.tick_size.x
      ) {
        ticks.push(wtos({ x: i, y: 0 }));
      }
    } else {
      const origin_world = stow({ x: 0, y: state.canvas_dimensions.height });
      const first_tick = origin_world.y - (origin_world.y % state.tick_size.y);
      let tick_rate = 0;
      for (
        let j = first_tick;
        j < stow({ x: 0, y: 0 }).y;
        j += state.tick_size.y
      ) {
        ticks.push(wtos({ x: 0, y: j }));
      }
    }
    return ticks;
  }

  function handle_mousedown(e) {
    requestAnimationFrame(() =>
      setState({
        ...state,
        mouse_down: true,
        click_position: {
          x: e.clientX,
          y: e.clientY,
        },
      })
    );
  }

  function handle_mouseup(e) {
    setState({ ...state, mouse_down: false });
  }

  function handle_pan(e) {
    if (state.mouse_down) {
      const offset = {
        x: e.clientX - state.click_position.x,
        y: e.clientY - state.click_position.y,
      };

      requestAnimationFrame(() => {
        setState({
          ...state,
          offset: {
            x: state.offset.x + offset.x,
            y: state.offset.y + offset.y,
          },
          click_position: {
            x: e.clientX,
            y: e.clientY,
          },
        });
      });
    }
  }

  function handle_zoom(e) {
    if (e.deltaY < 0) {
      requestAnimationFrame(() =>
        setState({
          ...state,
          scale: {
            ...state.scale,
            x: state.scale.x + state.scale.x * 0.05,
          },
        })
      );
    } else {
      requestAnimationFrame(() =>
        setState({
          ...state,
          scale: {
            ...state.scale,
            x: state.scale.x - state.scale.x * 0.05,
          },
        })
      );
    }
  }

  function generate_candlesticks() {}

  function set_canvas_measurements() {
    let offset_x = 0;
    let offset_y = 0;
    if (candles.length > 0) {
      let anchor = {
        x: state.canvas_dimensions.width,
        y: state.canvas_dimensions.height / 2,
      };

      offset_x = anchor.x - state.scale.x * 500;
      offset_y = anchor.y + parseFloat(candles[500].Open) * state.scale.y;
      // console.log(candles[500]);
      // console.log(parseFloat(candles[500].Open));
      // console.log(parseFloat(candles[500].Close));
    }
    setState({
      ...state,
      initialized: true,
      canvas_dimensions: {
        width: canvas_ref.current.clientWidth,
        height: canvas_ref.current.clientHeight,
      },
      origin_offset: {
        x: 0,
        y: canvas_ref.current.clientHeight,
      },
      offset: {
        x: offset_x,
        y: offset_y - canvas_ref.current.clientHeight,
      },
    });
    console.log('offset: ', offset_x, offset_y);
  }

  function calculate() {
    set_canvas_measurements();
    generate_candlesticks();
  }

  async function getCandleSticks() {
    const response = await axios.get('http://localhost:4000/');
    console.log(response);
    setCandles(response.data.price_data);
  }

  useEffect(() => {
    if (candles.length <= 0) {
      getCandleSticks();
    }
    calculate();
    window.addEventListener('resize', calculate);
    return () => {
      window.removeEventListener('resize', calculate);
    };
  }, [candles]);

  return (
    <div className={styles.main}>
      <svg
        className={styles.canvas}
        xmlns="http://www.w3.org/2000/svg"
        onMouseDown={handle_mousedown}
        onMouseUp={handle_mouseup}
        onMouseMove={handle_pan}
        onWheel={handle_zoom}
      >
        <g ref={canvas_ref} className={styles.grid} width={500} height={500}>
          {candles.length > 0 && (
            <circle
              cx={
                wtos({
                  x: 500,
                  y: 0,
                }).x
              }
              cy={
                wtos({
                  x: 0,
                  y: parseFloat(candles[500].Open),
                }).y
              }
              r={20}
              fill="red"
            />
          )}
          {candles.slice(0, 501).map((candle, index) => (
            <rect
              x={wtos({ x: index, y: 0 }).x}
              y={wtos({ x: 0, y: parseFloat(candle.Open) }).y}
              width={5}
              height={25}
              stroke="2px solid red"
            />
          ))}
        </g>

        <g className={styles.xAxis}>
          {/* x-axis */}
          <line
            x1={0}
            y1={state.origin_offset.y}
            x2={state.canvas_dimensions.width}
            y2={state.canvas_dimensions.height}
            stroke="black"
          />

          {generate_ticks('x').map((tick_position, index) => (
            <line
              key={index}
              x1={tick_position.x}
              y1={state.origin_offset.y + 10}
              x2={tick_position.x}
              y2={state.origin_offset.y - 10}
              stroke="black"
              strokeLinecap="round"
              strokeWidth="0.5"
            />
          ))}
        </g>
        <g className={styles.yAxis}>
          {/* y-axis */}
          <line
            x1={0}
            y1={state.origin_offset.y}
            x2={0}
            y2={0}
            stroke="black"
          />
          {generate_ticks('y').map((tick_position, index) => (
            <line
              key={index}
              x1={state.origin_offset.x + 10}
              y1={tick_position.y}
              x2={state.origin_offset.x - 10}
              y2={tick_position.y}
              stroke="black"
              strokeLinecap="round"
              strokeWidth="0.5"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
