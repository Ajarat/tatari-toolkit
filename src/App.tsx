import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import Calendar from './pages/Calendar';
import Evolutions from './pages/Evolutions';
import MyTatari from './pages/MyTatari';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Calendar />} />
        <Route path="tatari" element={<MyTatari />} />
        <Route path="evolutions" element={<Evolutions />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
