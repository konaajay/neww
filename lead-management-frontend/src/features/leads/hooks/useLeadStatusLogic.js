import { useState, useMemo, useCallback } from 'react';

export const useLeadStatusLogic = (initialTotal = '', initialPaid = 0) => {
  const [totalAmount, setTotalAmount] = useState(initialTotal);
  const [totalPaidSoFar, setTotalPaidSoFar] = useState(initialPaid);
  const [initialAmount, setInitialAmount] = useState('');
  const [discount, setDiscount] = useState(0);
  const [installments, setInstallments] = useState([]);
  const [paymentType, setPaymentType] = useState('FULL');

  const discountedTotal = useMemo(() => {
    return Number(totalAmount || 0) - Number(discount || 0);
  }, [totalAmount, discount]);

  const addInstallment = useCallback(() => {
    setInstallments(prev => {
      if (prev.length >= 4) return prev;
      return [...prev, { amount: '', dueDate: '' }];
    });
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
      let sanitizedValue = value;
      if (field === 'amount') {
        sanitizedValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
      }
      updated[index] = { ...updated[index], [field]: sanitizedValue };
      return updated;
    });
  }, []);

  const sumOfParts = useMemo(() => {
    return Number(initialAmount || 0) + installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
  }, [initialAmount, installments]);

  const balanceRemaining = useMemo(() => {
    if (paymentType === 'FULL') {
      return Number(discountedTotal) - Number(initialAmount || 0);
    }
    return Number(discountedTotal || 0) - sumOfParts;
  }, [paymentType, discountedTotal, initialAmount, sumOfParts]);

  const isMatch = useMemo(() => {
    if (paymentType === 'FULL') {
      return Number(initialAmount || 0) === Number(discountedTotal || 0);
    }
    return Math.abs(balanceRemaining) < 0.01;
  }, [paymentType, initialAmount, discountedTotal, balanceRemaining]);

  return {
    totalAmount, setTotalAmount,
    discount, setDiscount,
    discountedTotal,
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
