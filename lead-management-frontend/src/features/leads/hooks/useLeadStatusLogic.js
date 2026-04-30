import { useState, useMemo, useCallback } from 'react';

export const useLeadStatusLogic = (initialTotal = '', initialPaid = 0) => {
  const [totalAmount, setTotalAmount] = useState(initialTotal);
  const [totalPaidSoFar, setTotalPaidSoFar] = useState(initialPaid);
  const [initialAmount, setInitialAmount] = useState('');
  const [installments, setInstallments] = useState([]);
  const [paymentType, setPaymentType] = useState('FULL');

  const addInstallment = useCallback(() => {
    setInstallments(prev => [...prev, { amount: '', dueDate: '' }]);
    setPaymentType('EMI');
  }, []);

  const removeInstallment = useCallback((index) => {
    setInstallments(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) setPaymentType('FULL');
      return updated;
    });
  }, []);

  const handleInstallmentChange = useCallback((index, field, value) => {
    setInstallments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const sumOfParts = useMemo(() => {
    return Number(initialAmount || 0) + installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
  }, [initialAmount, installments]);

  const balanceRemaining = useMemo(() => {
    return Number(totalAmount || 0) - sumOfParts;
  }, [totalAmount, sumOfParts]);

  const isMatch = useMemo(() => {
    if (paymentType === 'FULL') return true;
    return Math.abs(balanceRemaining) < 1;
  }, [paymentType, balanceRemaining]);

  return {
    totalAmount, setTotalAmount,
    totalPaidSoFar, setTotalPaidSoFar,
    initialAmount, setInitialAmount,
    installments, setInstallments,
    paymentType, setPaymentType,
    addInstallment,
    removeInstallment,
    handleInstallmentChange,
    sumOfParts,
    balanceRemaining,
    isMatch
  };
};
