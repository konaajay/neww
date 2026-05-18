import { useState, useMemo, useCallback } from 'react';

/**
 * useLeadStatusLogic - Dynamic accounting engine for Lead conversions
 * Supports both internal state management and external state synchronization.
 */
export const useLeadStatusLogic = (externalState = {}) => {
  // Use external state if provided, otherwise fallback to internal state
  const [internalTotal, setInternalTotal] = useState('');
  const [internalPaid, setInternalPaid] = useState(0);
  const [internalInitial, setInternalInitial] = useState('');
  const [internalDiscount, setInternalDiscount] = useState(0);
  const [internalInstallments, setInternalInstallments] = useState([]);
  const [internalPaymentType, setInternalPaymentType] = useState('FULL');

  const totalAmount = externalState.totalAmount !== undefined ? externalState.totalAmount : internalTotal;
  const totalPaidSoFar = externalState.totalPaidSoFar !== undefined ? externalState.totalPaidSoFar : internalPaid;
  const initialAmount = externalState.initialAmount !== undefined ? externalState.initialAmount : internalInitial;
  const discount = externalState.discount !== undefined ? externalState.discount : internalDiscount;
  const installments = externalState.installments !== undefined ? externalState.installments : internalInstallments;
  const paymentType = externalState.paymentType !== undefined ? externalState.paymentType : internalPaymentType;

  const discountedTotal = useMemo(() => {
    return Number(totalAmount || 0) - Number(discount || 0);
  }, [totalAmount, discount]);

  const addInstallment = useCallback(() => {
    if (externalState.setInstallments) {
        externalState.setInstallments(prev => {
            if (prev.length >= 4) return prev;
            return [...prev, { amount: '', dueDate: '', invoicerKey: 'gyantrix' }];
        });
        if (externalState.setPaymentType) externalState.setPaymentType('EMI');
    } else {
        setInternalInstallments(prev => {
            if (prev.length >= 4) return prev;
            return [...prev, { amount: '', dueDate: '', invoicerKey: 'gyantrix' }];
        });
        setInternalPaymentType('EMI');
    }
  }, [externalState]);

  const removeInstallment = useCallback((index) => {
    if (externalState.setInstallments) {
        externalState.setInstallments(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0 && externalState.setPaymentType) externalState.setPaymentType('FULL');
            return updated;
        });
    } else {
        setInternalInstallments(prev => {
            const updated = prev.filter((_, i) => i !== index);
            if (updated.length === 0) setInternalPaymentType('FULL');
            return updated;
        });
    }
  }, [externalState]);

  const handleInstallmentChange = useCallback((index, field, value) => {
    const setter = externalState.setInstallments || setInternalInstallments;
    setter(prev => {
      const updated = [...prev];
      let sanitizedValue = value;
      if (field === 'amount') {
        sanitizedValue = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
      }
      updated[index] = { ...updated[index], [field]: sanitizedValue };
      return updated;
    });
  }, [externalState.setInstallments]);

  const sumOfParts = useMemo(() => {
    return Number(initialAmount || 0) + installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
  }, [initialAmount, installments]);

  const balanceRemaining = useMemo(() => {
    const target = Number(discountedTotal || 0) - Number(totalPaidSoFar || 0);
    if (paymentType === 'FULL') {
      return target - Number(initialAmount || 0);
    }
    return target - sumOfParts;
  }, [paymentType, discountedTotal, totalPaidSoFar, initialAmount, sumOfParts]);

  const isMatch = useMemo(() => {
    if (paymentType === 'FULL') {
      const target = Number(discountedTotal || 0) - Number(totalPaidSoFar || 0);
      return Math.abs(Number(initialAmount || 0) - target) < 0.01;
    }
    return Math.abs(balanceRemaining) < 0.01;
  }, [paymentType, initialAmount, discountedTotal, totalPaidSoFar, balanceRemaining]);

  return {
    totalAmount, setTotalAmount: externalState.setTotalAmount || setInternalTotal,
    discount, setDiscount: externalState.setDiscount || setInternalDiscount,
    discountedTotal,
    totalPaidSoFar, setTotalPaidSoFar: externalState.setTotalPaidSoFar || setInternalPaid,
    initialAmount, setInitialAmount: externalState.setInitialAmount || setInternalInitial,
    installments, setInstallments: externalState.setInstallments || setInternalInstallments,
    paymentType, setPaymentType: externalState.setPaymentType || setInternalPaymentType,
    addInstallment,
    removeInstallment,
    handleInstallmentChange,
    sumOfParts,
    balanceRemaining,
    isMatch
  };
};
