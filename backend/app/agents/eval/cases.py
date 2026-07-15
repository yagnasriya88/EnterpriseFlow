"""Small eval set: sample customer messages -> expected structural properties.

Not exhaustive prompt-quality testing — just enough to catch a regression
(wrong intent classification, hallucinated products, broken arithmetic)
when prompts or models change. Uses real names from synthetic_products_500.csv
so product_lookup has something to match against.
"""

CASES = [
    {
        "name": "simple_quote_known_product",
        "message": "Hi, can I get a quote for 3 ceramic coffee mugs?",
        "expected_intent": "quote_request",
        "expect_document": True,
    },
    {
        "name": "quote_with_service",
        "message": "I'd like to order a wireless mouse, and could you also set it up for me?",
        "expected_intent": "quote_request",
        "expect_document": True,
    },
    {
        "name": "underspecified_quantity",
        "message": "Send me a quote for some throw pillows please.",
        "expected_intent": "quote_request",
        "expect_document": True,
        "expect_assumptions": True,
    },
    {
        "name": "invoice_request",
        "message": "Please invoice me for 2 tea cups, we already agreed on the price.",
        "expected_intent": "invoice_request",
        "expect_document": True,
    },
    {
        "name": "general_policy_query",
        "message": "What's your return policy if the item arrives damaged?",
        "expected_intent": "general_query",
        "expect_document": False,
    },
    {
        "name": "gibberish",
        "message": "asdkjhqwe 12312 !!! ???",
        "expected_intent": "unknown",
        "expect_document": False,
    },
]
