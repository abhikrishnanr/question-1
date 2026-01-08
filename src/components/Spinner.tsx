import React from "react";

type SpinnerProps = {
  label?: string;
};

const Spinner: React.FC<SpinnerProps> = ({ label = "Loading" }) => {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__circle" aria-hidden="true" />
      <span className="spinner__text">{label}...</span>
    </div>
  );
};

export default Spinner;
