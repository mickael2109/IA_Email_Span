from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Message
from .classifier import MessageClassifier
import json
import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.management import call_command

classifier = MessageClassifier()

# Path to the data file
data_file_path = 'E:/IRD/M1/IA/EMAIL SPAN/serveurNodejs/data.csv'


@csrf_exempt
def reload_model(request):
    if request.method == 'POST':
        try:

            # Redémarrage du serveur
            call_command('restartserver')
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=400)


@csrf_exempt
def retrain_model(request):
    if request.method == 'POST':
        try:
            data = pd.read_csv(data_file_path)

            # stopwords
            stopwords = ["ny", "sy", "amin'ny", "no", "dia", "ao", "fa", "izay", "mbola", "koa", "hatrany", "avy", "efa", "amin'ny"]

            # Calculate TF-IDF
            tfidf = TfidfVectorizer(stop_words=stopwords)
            X = tfidf.fit_transform(data['lahatsoratra'])
            y = data['class']
 
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            # train the model
            model = LogisticRegression()  
            model.fit(X_train, y_train)

            # Save the model and the TF-IDF vectorizer
            model_path = os.path.join('backendDjango', 'model.joblib')
            tfidf_path = os.path.join('backendDjango', 'tfidf.joblib')

            joblib.dump(model, model_path)
            joblib.dump(tfidf, tfidf_path)
            
            return JsonResponse({'message': 'Modely nohavaozina sy voatahiry soa aman-tsara.'}, status=200)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=400)
    

@csrf_exempt
def classify_message(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            content = data.get('content')
            if content is None:
                return JsonResponse({'error': 'Content field is missing'}, status=400)

            is_spam = bool(classifier.predict(content) == 0)  # Convertir en type bool Python

            return JsonResponse({'content': content, 'is_spam': is_spam})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

