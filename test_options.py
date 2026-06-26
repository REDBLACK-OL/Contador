import urllib.request
import urllib.error

def test_origin(origin):
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/register",
        method="OPTIONS"
    )
    req.add_header("Origin", origin)
    req.add_header("Access-Control-Request-Method", "POST")
    req.add_header("Access-Control-Request-Headers", "content-type")
    
    try:
        with urllib.request.urlopen(req) as r:
            print(f"Origin: {origin} -> Status: {r.status}")
    except urllib.error.HTTPError as e:
        print(f"Origin: {origin} -> HTTP Error: {e.code}")
    except Exception as e:
        print(f"Origin: {origin} -> General Error: {e}")

if __name__ == "__main__":
    test_origin("http://localhost:5173")
    test_origin("http://127.0.0.1:5173")
    test_origin("http://localhost:3000")
