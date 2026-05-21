import api from './axios';

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay checkout modal and handles the full payment flow:
 *   1. Create order on backend
 *   2. Open Razorpay modal
 *   3. Verify payment on backend (creates booking/rental)
 *
 * @param {Object} options
 * @param {number} options.amount       - Amount in INR (e.g. 549.00)
 * @param {'booking'|'rental'} options.type - Payment type
 * @param {Object} options.payload      - Booking or rental creation payload
 * @param {Object} options.user         - Current user { name, email, phone }
 * @param {Function} options.onSuccess  - Called with the created booking/rental
 * @param {Function} options.onError    - Called with error message
 * @param {Object} [options.metadata]   - Extra metadata for the order
 */
export async function openRazorpayCheckout({
  amount,
  type,
  payload,
  user,
  onSuccess,
  onError,
  metadata = {},
}) {
  try {
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      onError?.('Razorpay SDK failed to load. Please check your internet connection or disable adblockers.');
      return;
    }

    // Step 1: Create order on backend
    const orderRes = await api.post('/payments/create-order', {
      amount,
      type,
      metadata,
    });

    if (!orderRes.success) {
      onError?.('Failed to initiate payment. Please try again.');
      return;
    }

    const { orderId, keyId } = orderRes.data;

    // Step 2: Configure & open Razorpay checkout
    const options = {
      key: keyId,
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      name: 'Seva Sarthi',
      description: type === 'booking'
        ? `Service Booking — ${payload.serviceName || 'Service'}`
        : `Tool Rental — ${payload.toolName || 'Tool'}`,
      order_id: orderId,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#0F172A',
        backdrop_color: 'rgba(15, 23, 42, 0.6)',
      },
      modal: {
        ondismiss: () => {
          onError?.('Payment cancelled by user.');
        },
      },
      handler: async function (response) {
        try {
          // Step 3: Verify payment on backend
          const verifyRes = await api.post('/payments/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            type,
            payload,
          });

          if (verifyRes.success) {
            const result = type === 'booking' ? verifyRes.data.booking : verifyRes.data.rental;
            onSuccess?.(result);
          } else {
            onError?.('Payment verification failed. Contact support.');
          }
        } catch (err) {
          console.error('Payment verification error:', err);
          onError?.(err?.response?.data?.message || 'Payment verification failed.');
        }
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', function (response) {
      console.error('Razorpay payment failed:', response.error);
      onError?.(response.error?.description || 'Payment failed. Please try again.');
    });

    rzp.open();
  } catch (err) {
    console.error('Razorpay checkout error:', err);
    onError?.(err?.response?.data?.message || 'Failed to initiate payment.');
  }
}
