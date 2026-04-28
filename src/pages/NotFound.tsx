import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">Página não encontrada</p>
      <Link to="/" className="text-primary hover:underline text-sm">Voltar ao Dashboard</Link>
    </div>
  );
}
