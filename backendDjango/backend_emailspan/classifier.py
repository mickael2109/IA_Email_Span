import joblib
from django.conf import settings


class MessageClassifier:
    def __init__(self):
        self.model = joblib.load(settings.MODEL_PATH)
        self.tfidf = joblib.load(settings.TFIDF_PATH)

    def predict(self, text):
        text_transformed = self.tfidf.transform([text])
        prediction = self.model.predict(text_transformed)
        return prediction[0]  # 1 pour email, 0 pour spam
