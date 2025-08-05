# byte_tracker.py
import numpy as np

class STrack:
    def __init__(self, tlwh, score, cls, track_id):
        self.tlwh = np.asarray(tlwh, dtype=np.float32)
        self.score = score
        self.cls = cls
        self.track_id = track_id

class BYTETracker:
    def __init__(self, track_thresh=0.5, match_thresh=0.7):
        self.track_thresh = track_thresh
        self.match_thresh = match_thresh
        self.tracks = []
        self.next_id = 0

    def update(self, detections, img_info=None, timer=None):
        new_tracks = []
        for det in detections:
            x1, y1, x2, y2, score, cls = det
            if score < self.track_thresh:
                continue
            matched = False
            tlwh = [x1, y1, x2-x1, y2-y1]
            for track in self.tracks:
                iou = self._iou(track.tlwh, tlwh)
                if iou > self.match_thresh:
                    track.tlwh = tlwh
                    track.score = score
                    track.cls = int(cls)
                    matched = True
                    new_tracks.append(track)
                    break
            if not matched:
                track = STrack(tlwh, score, int(cls), self.next_id)
                self.next_id += 1
                new_tracks.append(track)
        self.tracks = new_tracks
        return self.tracks

    def _iou(self, box1, box2):
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        xa = max(x1, x2)
        ya = max(y1, y2)
        xb = min(x1 + w1, x2 + w2)
        yb = min(y1 + h1, y2 + h2)
        inter = max(0, xb - xa) * max(0, yb - ya)
        union = w1 * h1 + w2 * h2 - inter
        return inter / union if union > 0 else 0
