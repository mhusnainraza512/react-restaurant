import React, { useEffect, useState, useContext, useRef } from "react";
import { NavLink } from "react-router-dom";

//axios and base url
import axios from "axios";
import { BASE_URL } from "../../../../BaseUrl";

//functions
import { _t, getCookie } from "../../../../functions/Functions";
import { useTranslation } from "react-i18next";

//3rd party packages
import { Helmet } from "react-helmet";
import Skeleton from "react-loading-skeleton";
import Moment from "react-moment";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { confirmAlert } from "react-confirm-alert";
import Countdown from "react-countdown-now";

//importing context consumer here
import { RestaurantContext } from "../../../../contexts/Restaurant";
import { FoodContext } from "../../../../contexts/Food";
import { invalid } from "moment";

const KitchenOnline = () => {
  const { t } = useTranslation();

  const {
    //kitchen dashboard
    getKitchenNewOrdersOnline,
    kithcenNewOrdersOnline,
    setKithcenNewOrdersOnline,
    loading,
    setLoading,
  } = useContext(RestaurantContext);

  const {
    //food group
    foodGroupForSearch,
  } = useContext(FoodContext);

  //state hooks
  const [filterOrder, setFilterOrder] = useState({
    isFiltered: false,
    filterKey: "",
    groups: null,
  });

  //search result
  const [searchedOrder, setSearchedOrder] = useState({
    list: null,
    searched: false,
  });

  useEffect(() => {
    //get all orders when coming to kithcen
    getKitchenNewOrdersOnline();

    //add "All" option to group filter
    let tempFoodGroups = [];
    foodGroupForSearch &&
      foodGroupForSearch.map((item) => {
        if (item.name !== "All") {
          tempFoodGroups.push(item);
        }
      });
    //new option added to food group
    tempFoodGroups.unshift({ name: "All" });
    setFilterOrder({
      ...filterOrder,
      groups: tempFoodGroups,
    });
  }, [foodGroupForSearch]);

  //filter ordered items
  const handleFilter = (foodGrp) => {
    setFilterOrder({
      ...filterOrder,
      isFiltered: foodGrp.name == "All" ? false : true,
      filterKey: foodGrp.name,
    });
  };

  //search orders here
  const handleSearch = (e) => {
    let searchInput = e.target.value.toLowerCase();
    if (searchInput.length === 0) {
      setSearchedOrder({ ...searchedOrder, searched: false });
    } else {
      let searchedList =
        kithcenNewOrdersOnline &&
        kithcenNewOrdersOnline.filter((item) => {
          //token
          let lowerCaseItemToken = item.token;

          return lowerCaseItemToken.includes(searchInput);
        });
      setSearchedOrder({
        ...searchedOrder,
        list: searchedList,
        searched: true,
      });
    }
  };

  //accept or reject
  const handleAcceptOrReject = (id, timeInMinutes, index) => {
    //front end accept-reject view update
    let newState = kithcenNewOrdersOnline.map((orderItem) =>
      orderItem.id === id
        ? {
            ...orderItem,
            time_to_deliver: timeInMinutes,
            is_accepted_by_kitchen:
              parseInt(orderItem.is_accepted_by_kitchen) === 0 ? 1 : 0,
          }
        : orderItem
    );

    setKithcenNewOrdersOnline(newState);

    //front end accept-reject view update for searched
    if (searchedOrder.searched) {
      let newStateSearched = searchedOrder.list.map((orderItemSearched) =>
        orderItemSearched.id === id
          ? {
              ...orderItemSearched,
              time_to_deliver: timeInMinutes,
              is_accepted_by_kitchen:
                parseInt(orderItemSearched.is_accepted_by_kitchen) === 0
                  ? 1
                  : 0,
            }
          : orderItemSearched
      );
      setSearchedOrder({
        ...searchedOrder,
        list: newStateSearched,
      });
    }

    //set on server
    const url = BASE_URL + "/settings/accept-new-order-online";
    let formData = {
      id,
      time_to_deliver: timeInMinutes,
    };
    return axios
      .post(url, formData, {
        headers: { Authorization: `Bearer ${getCookie()}` },
      })
      .then(() => {})
      .catch(() => {
        //undo if any error happened
        newState = newState.map((orderItem) =>
          orderItem.id === id
            ? {
                ...orderItem,
                is_accepted_by_kitchen:
                  parseInt(orderItem.is_accepted_by_kitchen) === 0 ? 1 : 0,
              }
            : orderItem
        );
        setKithcenNewOrdersOnline(newState);
        //undo if any error happened for searched
        if (searchedOrder.searched) {
          let newStateSearched = searchedOrder.list.map((orderItemSearched) =>
            orderItemSearched.id === id
              ? {
                  ...orderItemSearched,
                  is_accepted_by_kitchen:
                    parseInt(orderItemSearched.is_accepted_by_kitchen) === 0
                      ? 1
                      : 0,
                }
              : orderItemSearched
          );
          setSearchedOrder({
            ...searchedOrder,
            list: newStateSearched,
          });
        }
        toast.error(`${_t(t("Please refresh and try again"))}`, {
          position: "bottom-center",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          className: "text-center toast-notification",
        });
      });
  };

  //delete confirmation modal of waiter
  const handleReadyConfirmation = (id) => {
    confirmAlert({
      customUI: ({ onClose }) => {
        return (
          <div className="card card-body">
            <h1>{_t(t("Are you sure?"))}</h1>
            <p className="text-center">{_t(t("All items are cooked?"))}</p>
            <div className="d-flex justify-content-center">
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleReady(id);
                  onClose();
                }}
              >
                {_t(t("YES, COOKED!"))}
              </button>
              <button className="btn btn-success ml-2 px-3" onClick={onClose}>
                {_t(t("NO"))}
              </button>
            </div>
          </div>
        );
      },
    });
  };

  //make the order group ready here
  const handleReady = (id) => {
    setLoading(true);
    const url = BASE_URL + "/settings/mark-all-items-ready-online";
    let formData = {
      id,
    };
    return axios
      .post(url, formData, {
        headers: { Authorization: `Bearer ${getCookie()}` },
      })
      .then(() => {
        //remove ready item from order list
        let newState = kithcenNewOrdersOnline.filter((orderItem, index) => {
          if (orderItem.id === id) {
            kithcenNewOrdersOnline.splice(index, 1);
            setKithcenNewOrdersOnline(...kithcenNewOrdersOnline);
          }
          return orderItem.id !== id;
        });

        setKithcenNewOrdersOnline(newState);
        console.log(kithcenNewOrdersOnline);

        //remove ready item from search list
        if (searchedOrder.searched) {
          let newSearchState = searchedOrder.list.filter(
            (orderItemSearched) => {
              return orderItemSearched.id !== id;
            }
          );
          setSearchedOrder({
            ...searchedOrder,
            list: newSearchState,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.error(`${_t(t("Please refresh and try again"))}`, {
          position: "bottom-center",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          className: "text-center toast-notification",
        });
      });
  };

  //make the order group ready here
  const handleEachItemReady = (orderGroupId, itemId) => {
    //to redo the action
    let oldState = kithcenNewOrdersOnline;
    let oldSearchedState = searchedOrder.list;

    //new state
    let orderGroup = kithcenNewOrdersOnline.find((orderItem) => {
      return orderItem.id === orderGroupId;
    });

    //updating the item's cooking status
    let newItems = orderGroup.orderedItems.map((eachItem) =>
      eachItem.id === itemId
        ? {
            ...eachItem,
            is_cooking: parseInt(eachItem.is_cooking) === 0 ? 1 : 0,
          }
        : eachItem
    );

    //set updated order list with item's status change
    let newState = kithcenNewOrdersOnline.map((orderItem) =>
      orderItem.id === orderGroupId
        ? { ...orderItem, is_accepted_by_kitchen: 1, orderedItems: newItems }
        : orderItem
    );
    setKithcenNewOrdersOnline(newState);

    //searched list update
    if (searchedOrder.searched) {
      //new searched state
      let orderGroup = searchedOrder.list.find((orderItem) => {
        return orderItem.id === orderGroupId;
      });

      let newItemsSearched = orderGroup.orderedItems.map((eachItem) =>
        eachItem.id === itemId
          ? {
              ...eachItem,
              is_cooking: parseInt(eachItem.is_cooking) === 0 ? 1 : 0,
            }
          : eachItem
      );

      let newStateSearched = searchedOrder.list.map((orderItem) =>
        orderItem.id === orderGroupId
          ? {
              ...orderItem,
              is_accepted_by_kitchen: 1,
              orderedItems: newItemsSearched,
            }
          : orderItem
      );
      setSearchedOrder({
        ...searchedOrder,
        list: newStateSearched,
      });
    }

    //set server's item status
    const url = BASE_URL + "/settings/mark-order-item-ready-online";
    let formData = {
      orderGroupId: orderGroupId,
      id: itemId,
    };
    return axios
      .post(url, formData, {
        headers: { Authorization: `Bearer ${getCookie()}` },
      })
      .then(() => {})
      .catch(() => {
        //undo if any error occured
        setKithcenNewOrdersOnline(oldState);
        setSearchedOrder({
          ...searchedOrder,
          list: oldSearchedState,
        });
        toast.error(`${_t(t("Please refresh and try again"))}`, {
          position: "bottom-center",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          className: "text-center toast-notification",
        });
      });
  };

  const [isOpen, setIsOpen] = useState(false);
  const [itemID, setItemID] = useState(0);
  const [itemIndex, setItemIndex] = useState("");
  const [inputValue, setInputValue] = useState("");

  const openModal = (item_id, index) => {
    setItemID(item_id);
    setItemIndex(index);
    setIsOpen(prev=>!prev);
  };

  const saveAcceptOrder = () => {
    createCounter(new Date(), inputValue, itemIndex)
    handleAcceptOrReject(itemID, inputValue, itemIndex);
    setIsOpen(prev=>!prev);
  };

  const createCounter = (serverDateTime, minutes, index) => {
    var futureDateTime = serverDateTime;
    futureDateTime.setMinutes(futureDateTime.getMinutes() + parseInt(minutes));

    const updatedData = [...kithcenNewOrdersOnline];
    updatedData[index].accepted_by_kitchen_time = futureDateTime; // Update the remaining time
    setKithcenNewOrdersOnline(updatedData);
  }

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const closeModal = () => {
    setIsOpen(prev=>!prev);
  };

  return (
    <>
      <Helmet>
        <title>{_t(t("Online Order's Kitchen"))}</title>
      </Helmet>
      <div>
        {isOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h5>Order Ready Time</h5>
              <div className="form-group">
                <label>Enter Time In Minutes</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter minutes"
                  value={inputValue}
                  onChange={handleInputChange}
                />
              </div>
              <div className="my-2">
                <button className="btn btn-success" onClick={saveAcceptOrder}>
                  Accept
                </button>
                <button className="btn btn-dark ml-3" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <main id="main" data-simplebar>
        <div className="fk-scroll--index t-mt-15 t-mb-15" data-simplebar>
          <div className="container-fluid">
            <div className="t-bg-white t-pt-10 t-pb-10 t-pl-15 t-pr-15">
              {/* next page data spin loading */}
              <div className={`${loading && "loading"}`}></div>
              {/* spin loading ends */}
              <div className="row gx-2 align-items-center">
                <div className="col-md-3 t-mb-15 mb-md-0">
                  <ul className="t-list fk-breadcrumb">
                    <li className="fk-breadcrumb__list">
                      <span className="t-link fk-breadcrumb__link text-uppercase">
                        <span className="mr-2">
                          <img
                            src="/assets/img/cooking.png"
                            alt="cooking"
                            className="img-fluid"
                            style={{ height: "40px", width: "40px" }}
                          />
                        </span>
                        <span className="mr-1">
                          {_t(t("Online Orders Kitchen"))}
                        </span>{" "}
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="col-md-2">
                  <NavLink
                    to="/dashboard/kitchen"
                    onClick={() => {
                      getKitchenNewOrdersOnline();
                      setSearchedOrder({
                        ...searchedOrder,
                        searched: false,
                      });
                    }}
                    className="btn btn-warning btn-block sm-text text-uppercase mb-2 mb-md-0 text-truncate"
                  >
                    {_t(t("POS Orders"))}
                  </NavLink>
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    onClick={() => {
                      getKitchenNewOrdersOnline();
                      setSearchedOrder({
                        ...searchedOrder,
                        searched: false,
                      });
                    }}
                    className="btn btn-primary btn-block sm-text text-uppercase mb-2 mb-md-0 text-truncate"
                  >
                    {_t(t("Refresh"))}
                  </button>
                </div>
                <div className="col-md-2">
                  <Select
                    options={filterOrder.groups && filterOrder.groups}
                    components={makeAnimated()}
                    getOptionLabel={(option) => option.name}
                    getOptionValue={(option) => option.name}
                    classNamePrefix="select"
                    className="xsm-text mb-2 mb-md-0 "
                    onChange={handleFilter}
                    maxMenuHeight="200px"
                    placeholder={_t(t("Filter by group")) + ".."}
                  />
                </div>

                <div className="col-md-3">
                  <div className="input-group">
                    <div className="form-file">
                      <input
                        type="text"
                        className="form-control border-0 form-control--light-1 rounded-0"
                        placeholder={_t(t("Search by token")) + ".."}
                        onChange={handleSearch}
                      />
                    </div>
                    <button className="btn btn-primary" type="button">
                      <i className="fa fa-search" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {!searchedOrder.searched ? (
              <div className="row no-gutters g-4 mt-1">
                {kithcenNewOrdersOnline ? (
                  [
                    kithcenNewOrdersOnline.length > 0 ? (
                      kithcenNewOrdersOnline.map((item, index) => {
                        return (
                          <div
                            className="col-md-6 col-xl-4"
                            key={item.id}
                            data-category={index + 1}
                          >
                            <div className="fk-order-token t-bg-white p-3 h-100">
                              <div className="fk-order-token__footer text-right">
                                {item.is_accepted_by_kitchen == 1 &&
                                  item.is_ready == 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-danger xsm-text text-uppercase btn-lg mr-2"
                                    >
                                      <Countdown date={new Date(item.accepted_by_kitchen_time)} />
                                    </button>
                                  )}

                                <button
                                  type="button"
                                  className="btn btn-success xsm-text text-uppercase btn-lg mr-2"
                                  onClick={() =>
                                    handleReadyConfirmation(item.id)
                                  }
                                >
                                  {_t(t("Order ready"))}
                                </button>
                                {parseInt(item.is_accepted_by_kitchen) === 0 ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary xsm-text text-uppercase btn-lg"
                                    onClick={() => openModal(item.id, index)}
                                  >
                                    {_t(t("Accept order"))}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary xsm-text text-uppercase btn-lg"
                                    onClick={() =>
                                      handleAcceptOrReject(item.id, 0, index)
                                    }
                                  >
                                    {_t(t("Make order pending"))}
                                  </button>
                                )}
                              </div>
                              <div className="fk-order-token__body">
                                <div className="fk-addons-table">
                                  <div className="fk-addons-table__head d-flex justify-content-between px-3">
                                    <span>
                                      {_t(t("order token"))}: #{item.token}
                                    </span>
                                    <span>
                                      {_t(t("ordered at"))}:{" "}
                                      <Moment format="LT">
                                        {item.created_at}
                                      </Moment>
                                    </span>
                                  </div>
                                  <div className="fk-addons-table__info">
                                    <div className="row g-0">
                                      <div className="col-2 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("S/L"))}
                                        </span>
                                      </div>
                                      <div className="col-3 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("food"))}
                                        </span>
                                      </div>
                                      <div className="col-4 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("Additional Info"))}
                                        </span>
                                      </div>
                                      <div className="col-2 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("QTY"))}
                                        </span>
                                      </div>
                                      <div className="col-1 text-center py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          <i className="fa fa-check"></i>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="fk-addons-table__body">
                                    {item.orderedItems.map(
                                      (thisItem, indexThisItem) => {
                                        if (filterOrder.isFiltered) {
                                          if (
                                            thisItem.food_group ===
                                            filterOrder.filterKey
                                          ) {
                                            return (
                                              <div className="fk-addons-table__body-row">
                                                <div className="row g-0">
                                                  <div className="col-2 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {indexThisItem + 1}
                                                    </span>
                                                  </div>
                                                  <div className="col-3 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {thisItem.food_item} (
                                                      {thisItem.food_group})
                                                    </span>
                                                  </div>
                                                  <div className="col-4 text-center border-right t-pl-10 t-pr-10 py-2">
                                                    {thisItem.variation !==
                                                      null && (
                                                      <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pt-5">
                                                        <span className="font-weight-bold mr-1">
                                                          {_t(t("variation"))}:
                                                        </span>
                                                        {thisItem.variation}
                                                      </span>
                                                    )}

                                                    {thisItem.properties !==
                                                      null && (
                                                      <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pb-5">
                                                        <span className="font-weight-bold mr-1">
                                                          {_t(t("properties"))}:
                                                        </span>
                                                        {JSON.parse(
                                                          thisItem.properties
                                                        ).map(
                                                          (
                                                            propertyItem,
                                                            thisIndex
                                                          ) => {
                                                            if (
                                                              thisIndex !==
                                                              JSON.parse(
                                                                thisItem.properties
                                                              ).length -
                                                                1
                                                            ) {
                                                              return (
                                                                propertyItem.property +
                                                                ", "
                                                              );
                                                            } else {
                                                              return propertyItem.property;
                                                            }
                                                          }
                                                        )}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="col-2 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {thisItem.quantity}
                                                    </span>
                                                  </div>

                                                  <div className="col-1 text-center d-flex py-2">
                                                    <label className="mx-checkbox mx-checkbox--empty m-auto">
                                                      <input
                                                        type="checkbox"
                                                        className="mx-checkbox__input mx-checkbox__input-solid mx-checkbox__input-solid--danger mx-checkbox__input-sm mt-0-kitchen"
                                                        checked={
                                                          parseInt(
                                                            thisItem.is_cooking
                                                          ) === 1
                                                        }
                                                        onChange={() => {
                                                          handleEachItemReady(
                                                            item.id,
                                                            thisItem.id
                                                          );
                                                        }}
                                                      />
                                                      <span className="mx-checkbox__text text-capitalize t-text-heading fk-addons-table__body-text"></span>
                                                    </label>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }
                                        } else {
                                          return (
                                            <div
                                              key={thisItem.id}
                                              className="fk-addons-table__body-row"
                                            >
                                              <div className="row g-0">
                                                <div className="col-2 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {indexThisItem + 1}
                                                  </span>
                                                </div>
                                                <div className="col-3 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {thisItem.food_item} (
                                                    {thisItem.food_group})
                                                  </span>
                                                </div>
                                                <div className="col-4 text-center border-right t-pl-10 t-pr-10 py-2">
                                                  {thisItem.variation !==
                                                    null && (
                                                    <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pt-5">
                                                      <span className="font-weight-bold mr-1">
                                                        {_t(t("variation"))}:
                                                      </span>
                                                      {thisItem.variation}
                                                    </span>
                                                  )}

                                                  {thisItem.properties !==
                                                    null && (
                                                    <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pb-5">
                                                      <span className="font-weight-bold mr-1">
                                                        {_t(t("properties"))}:
                                                      </span>
                                                      {JSON.parse(
                                                        thisItem.properties
                                                      ).map(
                                                        (
                                                          propertyItem,
                                                          thisIndex
                                                        ) => {
                                                          if (
                                                            thisIndex !==
                                                            JSON.parse(
                                                              thisItem.properties
                                                            ).length -
                                                              1
                                                          ) {
                                                            return (
                                                              propertyItem.property +
                                                              ", "
                                                            );
                                                          } else {
                                                            return propertyItem.property;
                                                          }
                                                        }
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="col-2 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {thisItem.quantity}
                                                  </span>
                                                </div>

                                                <div className="col-1 text-center d-flex py-2">
                                                  <label className="mx-checkbox mx-checkbox--empty m-auto">
                                                    <input
                                                      type="checkbox"
                                                      className="mx-checkbox__input mx-checkbox__input-solid mx-checkbox__input-solid--danger mx-checkbox__input-sm mt-0-kitchen"
                                                      checked={
                                                        parseInt(
                                                          thisItem.is_cooking
                                                        ) === 1
                                                      }
                                                      onChange={() => {
                                                        handleEachItemReady(
                                                          item.id,
                                                          thisItem.id
                                                        );
                                                      }}
                                                    />
                                                    <span className="mx-checkbox__text text-capitalize t-text-heading fk-addons-table__body-text"></span>
                                                  </label>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-8 offset-2" data-category="1">
                        <div className="fk-order-token t-bg-white p-5 text-center text-uppercase text-primary no-order">
                          {/* No order in the kitchen */}
                          <img
                            src="/assets/img/no-order.jpg"
                            alt="no order found"
                            className="img-fluid h-100"
                          />
                        </div>
                      </div>
                    ),
                  ]
                ) : (
                  <div className="col-12" data-category="1">
                    <Skeleton
                      className="fk-order-token t-bg-white p-3 border border-2"
                      style={{ minHeight: "560px" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="row no-gutters g-4 mt-1">
                {searchedOrder ? (
                  [
                    searchedOrder.list.length > 0 ? (
                      searchedOrder.list.map((item, index) => {
                        return (
                          <div
                            className="col-md-6 col-xl-4"
                            data-category={index + 1}
                          >
                            <div className="fk-order-token t-bg-white p-3 h-100">
                              <div className="fk-order-token__footer text-right">
                                {item.is_accepted_by_kitchen == 1 &&
                                  item.is_ready == 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-danger xsm-text text-uppercase btn-lg mr-2"
                                    >
                                      <Countdown date={new Date(item.accepted_by_kitchen_time)} />
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  className="btn btn-success xsm-text text-uppercase btn-lg mr-2"
                                  onClick={() =>
                                    handleReadyConfirmation(item.id)
                                  }
                                >
                                  {_t(t("Order ready"))}
                                </button>
                                {parseInt(item.is_accepted_by_kitchen) === 0 ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary xsm-text text-uppercase btn-lg"
                                    onClick={() => openModal(item.id, index)}
                                  >
                                    {_t(t("Accept order"))}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-primary xsm-text text-uppercase btn-lg"
                                    onClick={() =>
                                      handleAcceptOrReject(item.id, 0, index)
                                    }
                                  >
                                    {_t(t("Make order pending"))}
                                  </button>
                                )}
                              </div>
                              <div className="fk-order-token__body">
                                <div className="fk-addons-table">
                                  <div className="fk-addons-table__head d-flex justify-content-between px-3">
                                    <span>
                                      {_t(t("order token"))}: #{item.token}
                                    </span>
                                    <span>
                                      {_t(t("ordered at"))}:{" "}
                                      <Moment format="LT">
                                        {item.created_at}
                                      </Moment>
                                    </span>
                                  </div>
                                  <div className="fk-addons-table__info">
                                    <div className="row g-0">
                                      <div className="col-2 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("S/L"))}
                                        </span>
                                      </div>
                                      <div className="col-3 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("food"))}
                                        </span>
                                      </div>
                                      <div className="col-4 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("Additional Info"))}
                                        </span>
                                      </div>
                                      <div className="col-2 text-center border-right py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          {_t(t("QTY"))}
                                        </span>
                                      </div>
                                      <div className="col-1 text-center py-2">
                                        <span className="fk-addons-table__info-text text-capitalize">
                                          <i className="fa fa-check"></i>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="fk-addons-table__body">
                                    {item.orderedItems.map(
                                      (thisItem, indexThisItem) => {
                                        if (filterOrder.isFiltered) {
                                          if (
                                            thisItem.food_group ===
                                            filterOrder.filterKey
                                          ) {
                                            return (
                                              <div className="fk-addons-table__body-row">
                                                <div className="row g-0">
                                                  <div className="col-2 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {indexThisItem + 1}
                                                    </span>
                                                  </div>
                                                  <div className="col-3 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {thisItem.food_item} (
                                                      {thisItem.food_group})
                                                    </span>
                                                  </div>
                                                  <div className="col-4 text-center border-right t-pl-10 t-pr-10 py-2">
                                                    {thisItem.variation !==
                                                      null && (
                                                      <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pt-5">
                                                        <span className="font-weight-bold mr-1">
                                                          {_t(t("variation"))}:
                                                        </span>
                                                        {thisItem.variation}
                                                      </span>
                                                    )}

                                                    {thisItem.properties !==
                                                      null && (
                                                      <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pb-5">
                                                        <span className="font-weight-bold mr-1">
                                                          {_t(t("properties"))}:
                                                        </span>
                                                        {JSON.parse(
                                                          thisItem.properties
                                                        ).map(
                                                          (
                                                            propertyItem,
                                                            thisIndex
                                                          ) => {
                                                            if (
                                                              thisIndex !==
                                                              JSON.parse(
                                                                thisItem.properties
                                                              ).length -
                                                                1
                                                            ) {
                                                              return (
                                                                propertyItem.property +
                                                                ", "
                                                              );
                                                            } else {
                                                              return propertyItem.property;
                                                            }
                                                          }
                                                        )}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="col-2 text-center border-right d-flex py-2">
                                                    <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                      {thisItem.quantity}
                                                    </span>
                                                  </div>

                                                  <div className="col-1 text-center d-flex py-2">
                                                    <label className="mx-checkbox mx-checkbox--empty m-auto">
                                                      <input
                                                        type="checkbox"
                                                        className="mx-checkbox__input mx-checkbox__input-solid mx-checkbox__input-solid--danger mx-checkbox__input-sm mt-0-kitchen"
                                                        checked={
                                                          parseInt(
                                                            thisItem.is_cooking
                                                          ) === 1
                                                        }
                                                        onChange={() => {
                                                          handleEachItemReady(
                                                            item.id,
                                                            thisItem.id
                                                          );
                                                        }}
                                                      />
                                                      <span className="mx-checkbox__text text-capitalize t-text-heading fk-addons-table__body-text"></span>
                                                    </label>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }
                                        } else {
                                          return (
                                            <div className="fk-addons-table__body-row">
                                              <div className="row g-0">
                                                <div className="col-2 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {indexThisItem + 1}
                                                  </span>
                                                </div>
                                                <div className="col-3 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {thisItem.food_item} (
                                                    {thisItem.food_group})
                                                  </span>
                                                </div>
                                                <div className="col-4 text-center border-right t-pl-10 t-pr-10 py-2">
                                                  {thisItem.variation !==
                                                    null && (
                                                    <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pt-5">
                                                      <span className="font-weight-bold mr-1">
                                                        {_t(t("variation"))}:
                                                      </span>
                                                      {thisItem.variation}
                                                    </span>
                                                  )}

                                                  {thisItem.properties !==
                                                    null && (
                                                    <span className="fk-addons-table__info-text text-capitalize d-block text-left t-pb-5">
                                                      <span className="font-weight-bold mr-1">
                                                        {_t(t("properties"))}:
                                                      </span>
                                                      {JSON.parse(
                                                        thisItem.properties
                                                      ).map(
                                                        (
                                                          propertyItem,
                                                          thisIndex
                                                        ) => {
                                                          if (
                                                            thisIndex !==
                                                            JSON.parse(
                                                              thisItem.properties
                                                            ).length -
                                                              1
                                                          ) {
                                                            return (
                                                              propertyItem.property +
                                                              ", "
                                                            );
                                                          } else {
                                                            return propertyItem.property;
                                                          }
                                                        }
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="col-2 text-center border-right d-flex py-2">
                                                  <span className="fk-addons-table__info-text text-capitalize m-auto">
                                                    {thisItem.quantity}
                                                  </span>
                                                </div>

                                                <div className="col-1 text-center d-flex py-2">
                                                  <label className="mx-checkbox mx-checkbox--empty m-auto">
                                                    <input
                                                      type="checkbox"
                                                      className="mx-checkbox__input mx-checkbox__input-solid mx-checkbox__input-solid--danger mx-checkbox__input-sm mt-0-kitchen"
                                                      checked={
                                                        parseInt(
                                                          thisItem.is_cooking
                                                        ) === 1
                                                      }
                                                      onChange={() => {
                                                        handleEachItemReady(
                                                          item.id,
                                                          thisItem.id
                                                        );
                                                      }}
                                                    />
                                                    <span className="mx-checkbox__text text-capitalize t-text-heading fk-addons-table__body-text"></span>
                                                  </label>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-8 offset-2" data-category="1">
                        <div className="fk-order-token t-bg-white p-5 text-center text-uppercase text-primary no-order">
                          {/* No order in the kitchen */}
                          <img
                            src="/assets/img/no-order.jpg"
                            alt="no order found"
                            className="img-fluid h-100"
                          />
                        </div>
                      </div>
                    ),
                  ]
                ) : (
                  <div className="col-12" data-category="1">
                    <Skeleton
                      className="fk-order-token t-bg-white p-3 border border-2"
                      style={{ minHeight: "560px" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default KitchenOnline;
