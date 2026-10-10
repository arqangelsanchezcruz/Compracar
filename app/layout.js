import './globals.css';

export const metadata = {
  title: 'CompraCar — Compra y vende tu auto seminuevo',
  description: 'Marketplace de compraventa de autos seminuevos en México, con inspección y revisión legal en hub físico.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <body>
        <header className="top">
          <div className="wrap top-in">
            <a className="brand" href="/"><span className="mark">C</span>CompraCar</a>
            <nav>
              <a href="/autos">Compra un auto</a>
              <a href="/vender">Vende tu auto</a>
              <a href="/#servicios">Servicios</a>
              <a href="/#contacto">Contáctanos</a>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap footer-grid">
            <span>© {new Date().getFullYear()} CompraCar · Hub Monterrey</span>
            <div className="links">
              <a href="/#servicios">Servicios</a>
              <a href="/#contacto">Contáctanos</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
