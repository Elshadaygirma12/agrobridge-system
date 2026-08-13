import '../styles/Button.css';

const Button = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  return (
    <button 
      className={`btn btn-${variant} ${isLoading ? 'btn-loading' : ''} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <span className="loader"></span> : null}
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;
