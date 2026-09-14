import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import layout from "../styles/layout.module.css";

export default function AdminLayout({ children, title }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className={layout.wrapper}>
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      <main className={layout.main}>
        <Header title={title} toggleSidebar={toggleSidebar} />

        <div className={layout.content}>{children}</div>
      </main>
    </div>
  );
}
