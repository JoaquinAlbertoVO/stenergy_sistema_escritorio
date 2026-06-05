from pydantic import BaseModel
from typing import List, Optional, Any

# ---- User ----
class UserBase(BaseModel):
    name: str
    username: str
    role: str

class UserCreate(UserBase):
    id: str
    password: str

class User(UserBase):
    id: str
    
    class Config:
        from_attributes = True

# ---- Course ----
class CourseBase(BaseModel):
    name: str
    shortName: str
    courseCode: Optional[str] = ""
    price: float
    color: str
    icon: str
    academicHours: str
    descriptionText: str

class CourseCreate(CourseBase):
    id: str

class Course(CourseBase):
    id: str
    
    class Config:
        from_attributes = True

# ---- Calendar ----
class CalendarEntryBase(BaseModel):
    courseId: str
    courseName: str
    startDate: str
    endDate: str
    selectedDates: Optional[List[str]] = None
    color: Optional[str] = None
    dailyDetails: Optional[Any] = None

class CalendarEntryCreate(CalendarEntryBase):
    id: str

class CalendarEntry(CalendarEntryBase):
    id: str
    
    class Config:
        from_attributes = True

# ---- Payment ----
class PaymentBase(BaseModel):
    date: str
    amount: float
    account: str

class PaymentCreate(PaymentBase):
    id: str
    saleId: str

class Payment(PaymentBase):
    id: str
    saleId: str

    class Config:
        from_attributes = True

# ---- Sale ----
class SaleBase(BaseModel):
    date: str
    clientId: Optional[str] = None
    clientName: str
    clientDni: str
    clientPhone: Optional[str] = ""
    clientEmail: Optional[str] = ""
    courseId: str
    courseName: str
    modality: str
    sellerId: str
    sellerName: str
    status: str
    totalAmount: float
    paidAmount: float
    certificateGenerated: bool = False
    certificateOverrides: Optional[Any] = None

class SaleCreate(SaleBase):
    id: str
    payments: Optional[List[PaymentCreate]] = []

class SaleUpdate(BaseModel):
    date: Optional[str] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    clientDni: Optional[str] = None
    clientPhone: Optional[str] = None
    clientEmail: Optional[str] = None
    courseId: Optional[str] = None
    courseName: Optional[str] = None
    modality: Optional[str] = None
    sellerId: Optional[str] = None
    sellerName: Optional[str] = None
    status: Optional[str] = None
    totalAmount: Optional[float] = None
    paidAmount: Optional[float] = None
    certificateGenerated: Optional[bool] = None
    certificateOverrides: Optional[Any] = None
    payments: Optional[List[PaymentCreate]] = None

class Sale(SaleBase):
    id: str
    payments: List[Payment] = []
    
    class Config:
        from_attributes = True
