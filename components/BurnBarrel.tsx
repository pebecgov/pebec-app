import { useState } from "react";
import { FiTrash } from "react-icons/fi";
import { FaFire } from "react-icons/fa";

const BurnBarrel = ({ deleteTask }) => {
  const [active, setActive] = useState(false);

  const handleDragEnd = (e) => {
    const cardId = e.dataTransfer.getData("cardId");
    deleteTask({ taskId: cardId });
    setActive(false);
  };

  return (
    <div
      onDrop={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl transition ${
        active ? "border-red-800 bg-red-800/20 text-red-500" : "border-neutral-500 bg-neutral-500/20 text-neutral-500"
      }`}
    >
      {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
    </div>
  );
};

export default BurnBarrel;
