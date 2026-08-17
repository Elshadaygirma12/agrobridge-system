import React, { useId } from 'react';
import '../styles/Input.css';

const Input = React.forwardRef(({ label, error, type = 'text', helperText, className = '', ...props }, ref) => {
  const id = useId();
  
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-container">
        <input
          id={id}
          ref={ref}
          type={type}
          className={`input-field ${error ? 'input-error' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-message error-message">{error}</span>}
      {!error && helperText && <span className="input-message helper-message">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
