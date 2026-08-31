import { CreateForm } from "./components/CreateForm";
import { Routes, Route } from "react-router-dom";
import { JoinForm } from "./components/JoinForm";
import { SummaryTrip } from "./components/SummaryTrip";

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateForm />} />
      <Route path="/trips/:id" element={<JoinForm />} />
      <Route path="/trips/:id/summary" element={<SummaryTrip />} />
    </Routes>
  );
}

export default App;
