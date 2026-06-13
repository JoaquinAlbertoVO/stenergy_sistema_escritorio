from sqlalchemy.orm import Session
from . import models, schemas

# ---- User ----
def get_users(db: Session):
    return db.query(models.User).all()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ---- Course ----
def get_courses(db: Session):
    return db.query(models.Course).all()

def create_course(db: Session, course: schemas.CourseCreate):
    db_course = models.Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def update_course(db: Session, course_id: str, course_data: dict):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if db_course:
        for key, value in course_data.items():
            setattr(db_course, key, value)
        db.commit()
        db.refresh(db_course)
    return db_course

def delete_course(db: Session, course_id: str):
    db_course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if db_course:
        db.delete(db_course)
        db.commit()
    return db_course

# ---- Calendar ----
def get_calendar(db: Session):
    return db.query(models.CalendarEntry).all()

def create_calendar_entry(db: Session, entry: schemas.CalendarEntryCreate):
    db_entry = models.CalendarEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def update_calendar_entry(db: Session, entry_id: str, entry_data: dict):
    db_entry = db.query(models.CalendarEntry).filter(models.CalendarEntry.id == entry_id).first()
    if db_entry:
        for key, value in entry_data.items():
            setattr(db_entry, key, value)
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_calendar_entry(db: Session, entry_id: str):
    db_entry = db.query(models.CalendarEntry).filter(models.CalendarEntry.id == entry_id).first()
    if db_entry:
        db.delete(db_entry)
        db.commit()
    return db_entry

# ---- Sales ----
def get_sales(db: Session):
    return db.query(models.Sale).order_by(models.Sale.date.desc()).all()

def create_sale(db: Session, sale: schemas.SaleCreate):
    # Separa los payments
    sale_data = sale.dict(exclude={'payments'})
    db_sale = models.Sale(**sale_data)
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    for payment_data in sale.payments:
        db_payment = models.Payment(**payment_data.dict())
        db.add(db_payment)
    db.commit()
    db.refresh(db_sale)
    return db_sale

def update_sale(db: Session, sale_id: str, sale_update: schemas.SaleUpdate):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not db_sale:
        return None
    
    update_data = sale_update.dict(exclude_unset=True)
    if 'payments' in update_data:
        # Reemplazar todos los payments
        db.query(models.Payment).filter(models.Payment.saleId == sale_id).delete()
        for payment_data in update_data['payments']:
            db_payment = models.Payment(**payment_data)
            db.add(db_payment)
        del update_data['payments']
    
    for key, value in update_data.items():
        setattr(db_sale, key, value)
    
    db.commit()
    db.refresh(db_sale)
    return db_sale

def delete_sale(db: Session, sale_id: str):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if db_sale:
        db.delete(db_sale)
        db.commit()
    return db_sale
