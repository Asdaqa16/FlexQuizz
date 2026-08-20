class AdaptLearnAIError(Exception):
    """Base exception for AI integration layer."""


class PDFProcessingError(AdaptLearnAIError):
    pass


class ConceptExtractionError(AdaptLearnAIError):
    pass


class QuestionGenerationError(AdaptLearnAIError):
    pass


class ValidationFailedError(AdaptLearnAIError):
    pass