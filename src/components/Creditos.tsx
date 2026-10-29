/** Pie de página con los créditos de los recursos de terceros. */
export default function Creditos() {
  return (
    <footer className="border-t border-borde px-4 py-1 text-[10px] leading-tight text-tenue sm:px-6">
      <p>
        Créditos: íconos de{" "}
        <a
          href="https://lucide.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-borde-fuerte underline-offset-2 hover:text-texto"
        >
          Lucide
        </a>{" "}
        (licencia ISC).
      </p>
    </footer>
  );
}
