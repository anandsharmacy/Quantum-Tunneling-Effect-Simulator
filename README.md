# Quantum Tunneling Effect Simulator

An interactive web-based physics simulation of the Quantum Tunneling Effect, visualizing the time-dependent Schrödinger equation (TDSE) using the Crank-Nicolson method.

![Simulator Interface](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)

## Features

- **Real-Time Visualization:** Animates the real ($\Re(\psi)$) and imaginary ($\Im(\psi)$) parts of the quantum wavepacket along with the potential barrier ($V(x)$).
- **Dynamic Physics Engine:**
  - Implements the unconditionally stable **Crank-Nicolson implicitly numerical method**.
  - Accurate numerical integration ensuring unitary evolution ($||\psi||^2 = 1$).
  - Built-in Thomas algorithm for fast $O(N)$ tridiagonal matrix solving.
- **Interactive Controls:**
  - **Barrier Configuration:** Adjust the **Height**, **Width**, and **Type** (single rectangular barrier, double slit, potential step, delta-like barrier, free particle).
  - **Wavepacket Parameters:** Tune the initial momentum ($k_0$) and spatial spread ($\sigma$).
  - **Playback & Speed:** Modulate simulation speed during execution and freeze playback on demand.
  - **Viewport Controls:** Zoom In, Zoom Out, and Recenter functionality for detailed physics analysis.
- **Real-Time Physics Readouts:** Live monitoring of Transmission ($T$), Reflection ($R$), Energy ($E$), and Wavepacket Norm ($||\psi||^2$).

## Project Structure

- `index.html`: The main user interface with mathematical info side-panels and viewport controls.
- `css/styles.css`: Custom CSS3 styling employing CSS variables, flexbox, and highly-polished UI/UX. 
- `js/main.js`: The central physics engine, handling TDSE numerical integration, HTML5 Canvas rendering, and event-handling.
- `quantum_tunneling-2.html`: A standalone version encompassing HTML, CSS, and JS in a single file for easy sharing.

## Usage & Installation

Since the simulator is built with vanilla web technologies, you can run it perfectly in your browser locally without any build steps, packages, or backend dependencies.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anandsharmacy/Quantum-Tunneling-Effect-Simulator.git
   ```
2. **Navigate to the directory:**
   ```bash
   cd Quantum-Tunneling-Effect-Simulator
   ```
3. **Start a local HTTP server:** (e.g., using Python 3)
   ```bash
   python3 -m http.server 8000
   ```
4. **Open your web browser:**
   Navigate to `http://localhost:8000`.

## Mathematical Foundation

- **Time-Dependent Schrödinger Equation (TDSE)**
- **WKB Approximation** for intuitive estimates of tunneling probability through rectangular barriers.
- **Numerical Matrices Compilation** ($A = I + i\alpha H$, $B = I - i\alpha H$).

## Developer
Developed for **NMIMS University** (School of Technology Management & Engineering, Hyderabad Campus).
Contact: anandsharmacy@gmail.com