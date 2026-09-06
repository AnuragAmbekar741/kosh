def test_cors_allows_web_origin(client) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == (
        "http://localhost:5173"
    )
    assert response.headers.get("access-control-allow-credentials") == "true"
