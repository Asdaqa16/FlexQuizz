from fastapi import FastAPI

app = FastAPI(title="FlexQuizz API")


@app.get("/")
def root():
    return {"message": "FlexQuizz API is running"}