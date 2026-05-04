import { CreditCard } from 'lucide-react';

const PaymentButton = ({ onClick, loading, disabled, amount = "499.00" }) => {
  return (
    <button
      className="btn btn-primary"
      onClick={onClick}
      disabled={disabled || loading}
      style={{ minWidth: '150px' }}
    >
      {loading ? (
        'Processing...'
      ) : (
        <>
          <CreditCard size={16} />
          Pay ₹{amount}
        </>
      )}
    </button>
  );
};

export default PaymentButton;
