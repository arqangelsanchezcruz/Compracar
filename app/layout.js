import './globals.css';
import AuthNav from '../components/AuthNav';
import ChatWidget from '../components/ChatWidget';
import ScrollReveal from '../components/ScrollReveal';

export const metadata = {
  title: 'CARTRU — Autos. Confianza. Comunidad.',
  description: 'Marketplace de compraventa de autos seminuevos en México, con inspección y revisión legal en hub físico.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <body>
        <header className="top">
          <div className="wrap top-in">
            <a className="brand" href="/"><img src="/logo.png" alt="CARTRU" style={{ height: 40, display: 'block' }} /></a>
            <nav>
              <a href="/autos">Compra tu auto</a>
              <a href="/vender">Vende tu auto</a>
              <a href="/#servicios">Cómo funciona</a>
              <a href="/#quienes-somos">¿Quiénes somos?</a>
              <a href="/#contacto">Contacto</a>
            </nav>
            <div style={{ marginLeft: 'auto' }}>
              <AuthNav />
            </div>
          </div>
        </header>
        {children}
        <ChatWidget />
        <ScrollReveal />
        <footer>
          <div className="wrap footer-grid">
            <span>© {new Date().getFullYear()} CARTRU · Hub Monterrey</span>
            <div className="links">
              <a href="/#servicios">Cómo funciona</a>
              <a href="/#quienes-somos">¿Quiénes somos?</a>
              <a href="/#contacto">Contacto</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
