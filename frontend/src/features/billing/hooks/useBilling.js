import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { notify } from "../../../components/NotificationProvider";
import {
  cancelSubscription,
  getBillingPlans,
  getCurrentSubscription,
  getPaymentHistory,
  getSubscriptionEntitlement,
  getSubscriptionHistory,
} from "../api/billingApi";

export const useBilling = () => {
  const [paymentPage, setPaymentPage] = useState(0);
  const client = useQueryClient();
  const plans = useQuery({ queryKey: ["billing-plans"], queryFn: getBillingPlans });
  const current = useQuery({
    queryKey: ["billing-current"],
    queryFn: getCurrentSubscription,
  });
  const entitlement = useQuery({
    queryKey: ["billing-entitlement"],
    queryFn: getSubscriptionEntitlement,
  });
  const history = useQuery({
    queryKey: ["billing-subscription-history"],
    queryFn: () => getSubscriptionHistory(0, 20),
  });
  const payments = useQuery({
    queryKey: ["billing-payments", paymentPage],
    queryFn: () => getPaymentHistory(paymentPage, 20),
  });
  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async () => {
      notify.success({ title: "Subscription cancelled", message: "Your Free plan is now active." });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["billing-current"] }),
        client.invalidateQueries({ queryKey: ["billing-entitlement"] }),
        client.invalidateQueries({ queryKey: ["billing-subscription-history"] }),
      ]);
    },
    onError: (error) => notify.error({ title: "Cancellation failed", message: error.message }),
  });

  return {
    plans,
    current,
    entitlement,
    history,
    payments,
    paymentPage,
    setPaymentPage,
    cancel,
  };
};
