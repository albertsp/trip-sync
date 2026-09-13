import { Landing } from "./components/Landing";
import { Routes, Route } from "react-router-dom";
import { JoinForm } from "./components/JoinForm";
import { SummaryTrip } from "./components/SummaryTrip";
import { NotFound } from "./components/NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/trips/:id" element={<JoinForm />} />
      <Route path="/trips/:id/summary" element={<SummaryTrip />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
