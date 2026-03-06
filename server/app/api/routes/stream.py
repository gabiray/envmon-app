import time
from flask import Blueprint, Response

stream_bp = Blueprint("stream", __name__)


@stream_bp.get("/stream")
def stream():

    def gen():
        while True:
            yield f"event: ping\ndata: {int(time.time())}\n\n"
            time.sleep(2)

    return Response(gen(), mimetype="text/event-stream")
