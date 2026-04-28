import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Prospeccao from "@/pages/Prospeccao";
import Relatorios from "@/pages/Relatorios";
import Certificacao from "@/pages/Certificacao";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/prospeccao"    element={<Prospeccao />} />
        <Route path="/relatorios"    element={<Relatorios />} />
        <Route path="/certificacao"  element={<Certificacao />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*"              element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
