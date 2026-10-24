
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,

    razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,

    amount INTEGER NOT NULL CHECK (amount > 0),

    currency VARCHAR(3) NOT NULL DEFAULT 'INR',

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
