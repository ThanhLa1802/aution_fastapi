from fastapi import FastAPI
from app.modules.user.api import router as user_router
from app.modules.auction.api import router as auction_router
from app.modules.bid.api import router as bid_router

app = FastAPI()

app.include_router(user_router, prefix="/users")
app.include_router(auction_router, prefix="/auctions")
app.include_router(bid_router, prefix="/bids")