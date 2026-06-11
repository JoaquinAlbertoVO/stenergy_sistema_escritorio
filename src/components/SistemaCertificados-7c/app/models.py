from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Text, Date, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    shortName = Column(String)
    courseCode = Column(String)
    price = Column(Float)
    color = Column(String)
    icon = Column(String)
    academicHours = Column(String)
    descriptionText = Column(Text)
    cpanelFolder = Column(String, nullable=True)

class CalendarEntry(Base):
    __tablename__ = "calendar"

    id = Column(String, primary_key=True, index=True)
    courseId = Column(String, index=True)
    courseName = Column(String)
    startDate = Column(String)
    endDate = Column(String)
    selectedDates = Column(JSON, nullable=True)
    color = Column(String, nullable=True)
    dailyDetails = Column(JSON, nullable=True)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(String, primary_key=True, index=True)
    date = Column(String)
    clientId = Column(String)
    clientName = Column(String)
    clientDni = Column(String)
    clientPhone = Column(String, nullable=True)
    clientEmail = Column(String, nullable=True)
    courseId = Column(String)
    courseName = Column(String)
    modality = Column(String)
    sellerId = Column(String)
    sellerName = Column(String)
    status = Column(String)
    totalAmount = Column(Float)
    paidAmount = Column(Float)
    certificateGenerated = Column(Boolean, default=False)
    certificateOverrides = Column(JSON, nullable=True)
    
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    saleId = Column(String, ForeignKey("sales.id"))
    date = Column(String)
    amount = Column(Float)
    account = Column(String)

    sale = relationship("Sale", back_populates="payments")
